import "server-only";

import { Client as QStashClient } from "@upstash/qstash";

let qstashClientInstance: QStashClient | null = null;

export function getQStashToken(): string {
  const token = process.env.QSTASH_TOKEN?.trim();
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured on the server.");
  }
  return token;
}

export function getQStashSigningKeys(): { currentSigningKey?: string; nextSigningKey?: string } {
  return {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() || undefined,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY?.trim() || undefined,
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
