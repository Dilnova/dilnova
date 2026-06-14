'use server';

import tls from 'tls';
import net from 'net';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { rateLimit } from '@/shared/security/rate-limit';
import { z } from 'zod';
import { getSystemSetting } from '@/shared/platform/settings';

function sendRawSmtpEmail(options: {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const useTlsDirectly = options.port === 465;

    let socket: any;
    let step = 0;
    const responseLog: string[] = [];

    const send = (data: string) => {
      socket.write(data + '\r\n');
    };

    const handleData = (chunk: Buffer) => {
      const data = chunk.toString();
      responseLog.push(data);

      const lines = data.split('\r\n').filter(l => l.trim().length > 0);
      const lastLine = lines[lines.length - 1];
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (code >= 400) {
        socket.destroy();
        reject(new Error(`SMTP Error at step ${step}: ${lastLine}`));
        return;
      }

      if (useTlsDirectly) {
        if (step === 0 && code === 220) {
          send('EHLO localhost');
          step = 1;
        } else if (step === 1 && code === 250) {
          send('AUTH LOGIN');
          step = 2;
        } else if (step === 2 && code === 334) {
          send(Buffer.from(options.user).toString('base64'));
          step = 3;
        } else if (step === 3 && code === 334) {
          send(Buffer.from(options.pass).toString('base64'));
          step = 4;
        } else if (step === 4 && code === 235) {
          send(`MAIL FROM:<${options.from}>`);
          step = 5;
        } else if (step === 5 && code === 250) {
          send(`RCPT TO:<${options.to}>`);
          step = 6;
        } else if (step === 6 && code === 250) {
          send('DATA');
          step = 7;
        } else if (step === 7 && code === 354) {
          const emailData = [
            `From: "${options.fromName}" <${options.from}>`,
            `To: ${options.to}`,
            `Subject: ${options.subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset="UTF-8"',
            '',
            options.html,
            '.'
          ].join('\r\n');
          send(emailData);
          step = 8;
        } else if (step === 8 && code === 250) {
          send('QUIT');
          step = 9;
        } else if (step === 9) {
          socket.destroy();
          resolve(true);
        }
      } else {
        if (step === 0 && code === 220) {
          send('EHLO localhost');
          step = 1;
        } else if (step === 1 && code === 250) {
          send('STARTTLS');
          step = 1.5;
        } else if (step.toString() === '1.5' && code === 220) {
          socket.removeAllListeners('data');
          const secureSocket = tls.connect({
            socket: socket,
            host: options.host,
            rejectUnauthorized: true
          }, () => {
            step = 1.6;
            secureSocket.write('EHLO localhost\r\n');
          });

          secureSocket.on('data', handleSecureData);
          secureSocket.on('error', (err) => reject(err));
          socket = secureSocket;
        }
      }
    };

    const handleSecureData = (chunk: Buffer) => {
      const data = chunk.toString();
      responseLog.push(data);

      const lines = data.split('\r\n').filter(l => l.trim().length > 0);
      const lastLine = lines[lines.length - 1];
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (code >= 400) {
        socket.destroy();
        reject(new Error(`SMTP Error at step ${step}: ${lastLine}`));
        return;
      }

      if (step.toString() === '1.6' && code === 250) {
        send('AUTH LOGIN');
        step = 2;
      } else if (step === 2 && code === 334) {
        send(Buffer.from(options.user).toString('base64'));
        step = 3;
      } else if (step === 3 && code === 334) {
        send(Buffer.from(options.pass).toString('base64'));
        step = 4;
      } else if (step === 4 && code === 235) {
        send(`MAIL FROM:<${options.from}>`);
        step = 5;
      } else if (step === 5 && code === 250) {
        send(`RCPT TO:<${options.to}>`);
        step = 6;
      } else if (step === 6 && code === 250) {
        send('DATA');
        step = 7;
      } else if (step === 7 && code === 354) {
        const emailData = [
          `From: "${options.fromName}" <${options.from}>`,
          `To: ${options.to}`,
          `Subject: ${options.subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset="UTF-8"',
          '',
          options.html,
          '.'
        ].join('\r\n');
        send(emailData);
        step = 8;
      } else if (step === 8 && code === 250) {
        send('QUIT');
        step = 9;
      } else if (step === 9) {
        socket.destroy();
        resolve(true);
      }
    };

    if (useTlsDirectly) {
      socket = tls.connect({
        host: options.host,
        port: options.port,
        rejectUnauthorized: true,
      });
      socket.on('data', handleData);
      socket.on('error', (err: any) => reject(err));
      socket.on('end', () => {
        if (step < 9) {
          reject(new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`));
        }
      });
    } else {
      socket = net.connect({
        host: options.host,
        port: options.port,
      });
      socket.on('data', handleData);
      socket.on('error', (err: any) => reject(err));
      socket.on('end', () => {
        if (step < 9) {
          reject(new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`));
        }
      });
    }
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address format.'),
  category: z.enum(['collaboration', 'registration', 'info'], {
    message: 'Please select a valid inquiry category.',
  }),
  subject: z.string().min(3, 'Subject must be at least 3 characters.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

export async function submitContactFormAction(prevState: any, formData: FormData) {
  try {
    const rawName = formData.get('name') as string;
    const rawEmail = formData.get('email') as string;
    const rawCategory = formData.get('category') as string;
    const rawSubject = formData.get('subject') as string;
    const rawMessage = formData.get('message') as string;

    const parsedInput = contactFormSchema.safeParse({
      name: rawName,
      email: rawEmail,
      category: rawCategory,
      subject: rawSubject,
      message: rawMessage,
    });

    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.issues[0]?.message || 'Invalid input data.' };
    }

    const { name, email, category, subject, message } = parsedInput.data;

    // Sanitize user inputs to prevent SMTP header injection by removing CR/LF characters
    const cleanHeader = (val: string) => val.replace(/[\r\n]+/g, ' ');
    const sanitizedName = cleanHeader(name);
    const sanitizedEmail = cleanHeader(email);
    const sanitizedSubject = cleanHeader(subject);

    // Rate Limiting: Max 2 messages per minute per IP
    await rateLimit(2, 60 * 1000);

    // Save submission to database (saving sanitized strings)
    await db.insert(schema.contactSubmissions).values({
      name: sanitizedName,
      email: sanitizedEmail,
      category,
      subject: sanitizedSubject,
      message,
      status: 'pending',
    });

    const systemName = await getSystemSetting('system_name', 'Dilnova');
    const systemNameHub = `${systemName} Commerce Hub`;

    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@dilstar.pp.ua';
    const emailFromName = process.env.EMAIL_FROM_NAME || `${systemName} Contact Form`;

    if (!smtpUser || !smtpPassword) {
      console.error('SMTP credentials (SMTP_USER/SMTP_PASSWORD) are missing');
      return { success: false, error: 'SMTP configuration is incomplete on the server.' };
    }

    const categoryLabel = 
      category === 'collaboration' ? 'Collaboration / Partnership' : 
      category === 'registration' ? 'Organization / Vendor Registration' : 
      'General Inquiry / Learn More';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Form Submission</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #18181b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #6b21a8; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px;">
                ${systemNameHub.toUpperCase()}
              </h1>
              <p style="margin: 4px 0 0 0; color: #e9d5ff; font-size: 12px;">New Contact Submission</p>
            </div>
            <div style="padding: 24px;">
              <h2 style="font-size: 16px; color: #18181b; margin-top: 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Message Details</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; color: #71717a; width: 120px; font-weight: bold;">From:</td>
                  <td style="padding: 6px 0; color: #18181b;">${escapeHtml(sanitizedName)} &lt;${escapeHtml(sanitizedEmail)}&gt;</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a; font-weight: bold;">Category:</td>
                  <td style="padding: 6px 0; color: #6b21a8; font-weight: bold;">${categoryLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a; font-weight: bold;">Subject:</td>
                  <td style="padding: 6px 0; color: #18181b;">${escapeHtml(sanitizedSubject)}</td>
                </tr>
              </table>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; color: #334155; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</div>
            </div>
            <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa;">
              ${systemNameHub} &copy; 2026. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to the system email address
    await sendRawSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPassword,
      to: emailFromAddress,
      from: emailFromAddress,
      fromName: emailFromName,
      subject: `[Contact Form - ${categoryLabel}] ${sanitizedSubject}`,
      html: emailHtml,
    });

    return { success: true, error: null };
  } catch (error: unknown) {
    console.error('Failed to send contact email:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error.';
    return { success: false, error: errorMsg };
  }
}
