'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { rateLimit } from '@/shared/security/rate-limit';
import { z } from 'zod';
import { getSystemSetting } from '@/shared/platform/settings';
import { escapeHtml, sanitizeSmtpHeader, sendRawSmtpEmail } from '@/shared/email/smtp-client';
import { logger } from '@/shared/logging/logger';

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
    const rawHoneypot = formData.get('middleName') as string;
    if (rawHoneypot && rawHoneypot.trim().length > 0) {
      logger.warn('Spam contact submission detected and blocked via honeypot field.');
      // Silently succeed to trick automated spam bots
      return { success: true, error: null };
    }

    // Cloudflare Turnstile CAPTCHA Verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      const turnstileToken = formData.get('cf-turnstile-response') as string;
      if (!turnstileToken) {
        return { success: false, error: 'Please complete the CAPTCHA.' };
      }

      try {
        const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}`,
        });

        const verifyData = await verifyResponse.json();
        if (!verifyData.success) {
          logger.warn('Turnstile CAPTCHA verification failed', {
            errorCodes: verifyData['error-codes'],
          });
          return { success: false, error: 'CAPTCHA verification failed. Please try again.' };
        }
      } catch (error) {
        logger.error('Failed to verify Turnstile CAPTCHA due to network error', error);
        if (process.env.NODE_ENV === 'production') {
          return { success: false, error: 'CAPTCHA verification service is unavailable. Please try again later.' };
        }
      }
    }

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

    const sanitizedName = sanitizeSmtpHeader(name);
    const sanitizedEmail = sanitizeSmtpHeader(email);
    const sanitizedSubject = sanitizeSmtpHeader(subject);

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
      logger.error('SMTP credentials (SMTP_USER/SMTP_PASSWORD) are missing');
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
    logger.error('Failed to send contact email', {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMsg = process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again.'
      : error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}
