import "server-only";

import { getSystemSetting } from "@/shared/platform/settings";
import { sendRawSmtpEmail } from "@/shared/email/smtp-client";
import { logger } from "@/shared/logging/logger";
import { env } from "@/shared/config/env";

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
  const systemName = await getSystemSetting("system_name", "Dilnova");
  const smtpUser = env.email.smtpUser;
  const smtpPassword = env.email.smtpPassword;

  if (!smtpUser || !smtpPassword) {
    return null;
  }

  return {
    smtpHost: env.email.smtpHost,
    smtpPort: env.email.smtpPort,
    smtpUser,
    smtpPassword,
    emailFromAddress: env.email.fromAddress,
    emailFromName: env.email.fromName || `${systemName} Hub`,
    systemName,
  };
}

export async function sendSystemHtmlEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailSenderConfig();
  if (!config) {
    logger.warn("Email skipped: SMTP credentials are not configured", { to, subject });
    return { success: false, error: "SMTP configuration is incomplete on the server." };
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
    logger.error("Failed to send system email", error, { emailTo: "[REDACTED]", subject });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email.",
    };
  }
}
