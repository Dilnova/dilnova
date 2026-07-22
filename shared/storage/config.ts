/** Private bucket for bank payment slip images (signed URLs only). */
export const PAYMENT_SLIPS_BUCKET = "payment-slips";

/** Private bucket for temporary GDPR export JSON dumps. */
export const GDPR_EXPORTS_BUCKET = "gdpr-exports";

/** Short-lived signed URL TTL for viewing private slips in the app. */
export const PAYMENT_SLIP_SIGNED_URL_TTL_SECONDS = 300;

/** Short-lived signed URL TTL for securely downloading GDPR exports. */
export const GDPR_EXPORT_TTL_SECONDS = 300;

export const PAYMENT_SLIP_MAX_BYTES = 8 * 1024 * 1024;

export const PAYMENT_SLIP_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type PaymentSlipMimeType = (typeof PAYMENT_SLIP_ALLOWED_MIME_TYPES)[number];

export const PAYMENT_SLIP_MIME_TO_EXT: Record<PaymentSlipMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
