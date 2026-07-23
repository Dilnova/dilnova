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

export function getQStashClient(): QStashClient {
  if (!qstashClientInstance) {
    const token = getQStashToken();
    qstashClientInstance = new QStashClient({ token });
  }
  return qstashClientInstance;
}
