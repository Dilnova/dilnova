import 'server-only';

import { getSystemSetting } from '@/shared/platform/settings';
import { sendRawSmtpEmail } from '@/shared/email/smtp-client';
import { logger } from '@/shared/logging/logger';

export interface EmailSenderConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  emailFromAddress: string;
  emailFromName: string;
  systemName: string;
}

export async function getEmailSenderConfig(): Promise<EmailSenderConfig | null> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    return null;
  }

  return {
    smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser,
    smtpPassword,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'info@dilstar.pp.ua',
    emailFromName: process.env.EMAIL_FROM_NAME || `${systemName} Hub`,
    systemName,
  };
}

export async function sendSystemHtmlEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailSenderConfig();
  if (!config) {
    logger.warn('Email skipped: SMTP credentials are not configured', { to, subject });
    return { success: false, error: 'SMTP configuration is incomplete on the server.' };
  }

  try {
    await sendRawSmtpEmail({
      host: config.smtpHost,
      port: config.smtpPort,
      user: config.smtpUser,
      pass: config.smtpPassword,
      to,
      from: config.emailFromAddress,
      fromName: config.emailFromName,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    logger.error('Failed to send system email', error, { to, subject });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email.',
    };
  }
}
