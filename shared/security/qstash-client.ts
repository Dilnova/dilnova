import "server-only";

import { Client as QStashClient } from "@upstash/qstash";
import { env } from "@/shared/config/env";

let qstashClientInstance: QStashClient | null = null;

export function getQStashToken(): string {
  const token = env.upstash.qstashToken?.trim();
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured on the server.");
  }
  return token;
}

export function getQStashSigningKeys(): { currentSigningKey?: string; nextSigningKey?: string } {
  return {
    currentSigningKey: env.upstash.qstashCurrentSigningKey?.trim() || undefined,
    nextSigningKey: env.upstash.qstashNextSigningKey?.trim() || undefined,
  };
}

export function hasQStashSigningKeys(): boolean {
  const { currentSigningKey, nextSigningKey } = getQStashSigningKeys();
  return Boolean(currentSigningKey && nextSigningKey);
}

export function getQStashClient(): QStashClient {
  if (!qstashClientInstance) {
    const token = getQStashToken();
    qstashClientInstance = new QStashClient({ token });
  }
  return qstashClientInstance;
}
