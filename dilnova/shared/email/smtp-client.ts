import tls from 'tls';
import net from 'net';

export interface SmtpEmailOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
}

/** Custom SMTP transaction client using Node net/tls modules, supporting STARTTLS. */
export function sendRawSmtpEmail(options: SmtpEmailOptions): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const useTlsDirectly = options.port === 465;

    let socket: net.Socket | tls.TLSSocket;
    let step = 0;
    const responseLog: string[] = [];

    const send = (data: string) => {
      socket.write(`${data}\r\n`);
    };

    const handleData = (chunk: Buffer) => {
      const data = chunk.toString();
      responseLog.push(data);

      const lines = data.split('\r\n').filter((line) => line.trim().length > 0);
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
          send(buildEmailPayload(options));
          step = 8;
        } else if (step === 8 && code === 250) {
          send('QUIT');
          step = 9;
        } else if (step === 9) {
          socket.destroy();
          resolve(true);
        }
      } else if (step === 0 && code === 220) {
        send('EHLO localhost');
        step = 1;
      } else if (step === 1 && code === 250) {
        send('STARTTLS');
        step = 1.5;
      } else if (step === 1.5 && code === 220) {
        socket.removeAllListeners('data');
        const secureSocket = tls.connect(
          {
            socket,
            host: options.host,
            rejectUnauthorized: true,
          },
          () => {
            step = 1.6;
            secureSocket.write('EHLO localhost\r\n');
          }
        );

        secureSocket.on('data', handleSecureData);
        secureSocket.on('error', (err) => reject(err));
        socket = secureSocket;
      }
    };

    const handleSecureData = (chunk: Buffer) => {
      const data = chunk.toString();
      responseLog.push(data);

      const lines = data.split('\r\n').filter((line) => line.trim().length > 0);
      const lastLine = lines[lines.length - 1];
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (code >= 400) {
        socket.destroy();
        reject(new Error(`SMTP Error at step ${step}: ${lastLine}`));
        return;
      }

      if (step === 1.6 && code === 250) {
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
        send(buildEmailPayload(options));
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
      socket.on('error', (err) => reject(err));
      socket.on('end', () => {
        if (step < 9) {
          reject(
            new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`)
          );
        }
      });
    } else {
      socket = net.connect({
        host: options.host,
        port: options.port,
      });
      socket.on('data', handleData);
      socket.on('error', (err) => reject(err));
      socket.on('end', () => {
        if (step < 9) {
          reject(
            new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`)
          );
        }
      });
    }
  });
}

/** Strip CR/LF and other header-breaking characters from SMTP header values. */
export function sanitizeSmtpHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** Validate a single RFC5322 mailbox for RCPT TO / envelope use. */
export function sanitizeSmtpMailbox(value: string): string {
  const cleaned = sanitizeSmtpHeader(value);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(cleaned)) {
    throw new Error('Invalid email address.');
  }
  return cleaned;
}

function buildEmailPayload(options: SmtpEmailOptions): string {
  const fromName = sanitizeSmtpHeader(options.fromName);
  const from = sanitizeSmtpMailbox(options.from);
  const to = sanitizeSmtpMailbox(options.to);
  const subject = sanitizeSmtpHeader(options.subject);

  return [
    `From: "${fromName}" <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    options.html,
    '.',
  ].join('\r\n');
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
