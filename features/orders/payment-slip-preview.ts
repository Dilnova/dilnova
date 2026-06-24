import 'server-only';

import { resolvePaymentSlipPreviewUrl } from '@/shared/storage/payment-slip';

export type WithPaymentSlipPreview<T> = T & {
  paymentSlipPreviewUrl: string | null;
};

export async function attachPaymentSlipPreview<T extends { paymentSlipUrl?: string | null }>(
  order: T
): Promise<WithPaymentSlipPreview<T>> {
  return {
    ...order,
    paymentSlipPreviewUrl: await resolvePaymentSlipPreviewUrl(order.paymentSlipUrl),
  };
}

export async function attachPaymentSlipPreviews<T extends { paymentSlipUrl?: string | null }>(
  orders: T[]
): Promise<WithPaymentSlipPreview<T>[]> {
  return Promise.all(orders.map((order) => attachPaymentSlipPreview(order)));
}
