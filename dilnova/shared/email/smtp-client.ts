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
function sendRawSmtpEmailAttempt(options: SmtpEmailOptions): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const useTlsDirectly = options.port === 465;

    let socket: net.Socket | tls.TLSSocket;
    let step = 0;
    const responseLog: string[] = [];

    const overallTimeout = setTimeout(() => {
      if (socket) {
        socket.destroy();
      }
      fail(new Error('SMTP transaction overall deadline exceeded (30 seconds).'));
    }, 30000);

    const cleanup = () => {
      clearTimeout(overallTimeout);
    };

    const succeed = (val: boolean) => {
      cleanup();
      resolve(val);
    };

    const fail = (err: Error) => {
      cleanup();
      reject(err);
    };

    const setupSocketTimeout = (sock: net.Socket | tls.TLSSocket) => {
      sock.setTimeout(30000);
      sock.on('timeout', () => {
        sock.destroy();
        fail(new Error('SMTP socket inactivity timeout exceeded (30 seconds).'));
      });
    };

    const send = (data: string) => {
      if (socket && !socket.destroyed) {
        socket.write(`${data}\r\n`);
      }
    };

    const handleData = (chunk: Buffer) => {
      const data = chunk.toString();
      responseLog.push(data);

      const lines = data.split('\r\n').filter((line) => line.trim().length > 0);
      const lastLine = lines[lines.length - 1];
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (code >= 400) {
        socket.destroy();
        fail(new Error(`SMTP Error at step ${step}: ${lastLine}`));
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
          succeed(true);
        }
      } else if (step === 0 && code === 220) {
        send('EHLO localhost');
        step = 1;
      } else if (step === 1 && code === 250) {
        send('STARTTLS');
        step = 1.5;
      } else if (step === 1.5 && code === 220) {
        socket.removeAllListeners('data');
        socket.removeAllListeners('timeout');
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

        setupSocketTimeout(secureSocket);
        secureSocket.on('data', handleSecureData);
        secureSocket.on('error', (err) => fail(err));
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
        fail(new Error(`SMTP Error at step ${step}: ${lastLine}`));
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
        succeed(true);
      }
    };

    if (useTlsDirectly) {
      socket = tls.connect({
        host: options.host,
        port: options.port,
        rejectUnauthorized: true,
      });
      setupSocketTimeout(socket);
      socket.on('data', handleData);
      socket.on('error', (err) => fail(err));
      socket.on('end', () => {
        if (step < 9) {
          fail(
            new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`)
          );
        }
      });
    } else {
      socket = net.connect({
        host: options.host,
        port: options.port,
      });
      setupSocketTimeout(socket);
      socket.on('data', handleData);
      socket.on('error', (err) => fail(err));
      socket.on('end', () => {
        if (step < 9) {
          fail(
            new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`)
          );
        }
      });
    }
  });
}

/** Custom SMTP transaction client using Node net/tls modules, supporting STARTTLS. With socket timeouts and single retry. */
export async function sendRawSmtpEmail(options: SmtpEmailOptions): Promise<boolean> {
  try {
    return await sendRawSmtpEmailAttempt(options);
  } catch (error) {
    console.warn('First SMTP attempt failed, retrying once...', error);
    return await sendRawSmtpEmailAttempt(options);
  }
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
