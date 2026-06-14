import { randomUUID } from 'crypto';
import {
  PAYMENT_SLIP_ALLOWED_MIME_TYPES,
  type PaymentSlipMimeType,
} from '@/shared/storage/config';

/** Legacy rows store a public Cloudinary HTTPS URL. New rows store a storage object path. */
export function isLegacyPaymentSlipUrl(value: string): boolean {
  return value.startsWith('https://') || value.startsWith('http://');
}

export function isPaymentSlipStoragePath(value: string): boolean {
  return !isLegacyPaymentSlipUrl(value) && /^orders\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/i.test(value);
}

export function buildPaymentSlipStoragePath(orderId: string, extension: string): string {
  return `orders/${orderId}/${randomUUID()}.${extension}`;
}

export function resolvePaymentSlipExtension(contentType: string): PaymentSlipMimeType | null {
  if (!PAYMENT_SLIP_ALLOWED_MIME_TYPES.includes(contentType as PaymentSlipMimeType)) {
    return null;
  }
  return contentType as PaymentSlipMimeType;
}
