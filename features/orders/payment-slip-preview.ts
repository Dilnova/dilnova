import "server-only";

import { resolvePaymentSlipPreviewUrl } from "@/shared/storage/payment-slip";

export type WithPaymentSlipPreview<T> = T & {
  paymentSlipPreviewUrl: string | null;
};

export async function attachPaymentSlipPreview<T extends { paymentSlipUrl?: string | null }>(
  order: T,
): Promise<WithPaymentSlipPreview<T>> {
  return {
    ...order,
    paymentSlipPreviewUrl: await resolvePaymentSlipPreviewUrl(order.paymentSlipUrl),
  };
}

export async function attachPaymentSlipPreviews<T extends { paymentSlipUrl?: string | null }>(
  orders: T[],
): Promise<WithPaymentSlipPreview<T>[]> {
  const BATCH_SIZE = 5;
  const results: WithPaymentSlipPreview<T>[] = [];

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((order) => attachPaymentSlipPreview(order)));
    results.push(...batchResults);
  }

  return results;
}
