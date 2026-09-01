import { logger } from "@/shared/logging/logger";
import { WebhookPayload } from "../types";

/**
 * Dispatches structured product events to external webhooks (Zapier, Make, n8n, WhatsApp Cloud API bots).
 */
export async function dispatchProductWebhook({
  webhookUrl,
  event,
  orgId,
  product,
}: {
  webhookUrl: string;
  event: WebhookPayload["event"];
  orgId: string;
  product?: WebhookPayload["product"];
}): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const payload: WebhookPayload = {
      event,
      orgId,
      product,
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Dilnova-Commerce-Webhook/1.0",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `Webhook returned HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    logger.warn("Webhook dispatch failed", { webhookUrl, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to webhook",
    };
  }
}
