import { randomUUID } from "crypto";
import { PAYMENT_SLIP_ALLOWED_MIME_TYPES, type PaymentSlipMimeType } from "@/shared/storage/config";

/** Legacy rows store a public Cloudinary HTTPS URL. New rows store a storage object path. */
export function isLegacyPaymentSlipUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

export function isPaymentSlipStoragePath(value: string): boolean {
  return (
    !isLegacyPaymentSlipUrl(value) &&
    /^orders\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/i.test(value)
  );
}

export function buildPaymentSlipStoragePath(orderId: string, extension: string): string {
  return `orders/${orderId}/${randomUUID()}.${extension}`;
}

export function resolvePaymentSlipExtension(contentType: string): PaymentSlipMimeType | null {
  if (PAYMENT_SLIP_ALLOWED_MIME_TYPES.includes(contentType as PaymentSlipMimeType)) {
    return contentType as PaymentSlipMimeType;
  }
  return null;
}

export function resolvePaymentSlipExtensionFromFilename(
  filename: string,
): PaymentSlipMimeType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return null;
  }
}

/**
 * Detects the MIME type of an image buffer based on its binary magic bytes.
 * Supports the allowed payment slip image formats: JPEG, PNG, GIF, and WebP.
 * Returns null if the binary header does not match any allowed image format.
 */
export function detectImageMimeTypeFromMagicBytes(
  bytes: Uint8Array | Buffer,
): PaymentSlipMimeType | null {
  if (!bytes || bytes.length < 3) {
    return null;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF (52 49 46 46) .... WEBP (57 45 42 50)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validates that an image buffer has valid magic bytes for allowed payment slip images.
 * Optionally verifies that the detected format matches an expected content type.
 */
export function isAllowedImageMagicBytes(
  bytes: Uint8Array | Buffer,
  expectedContentType?: PaymentSlipMimeType,
): boolean {
  const detected = detectImageMimeTypeFromMagicBytes(bytes);
  if (!detected) {
    return false;
  }
  if (expectedContentType) {
    return detected === expectedContentType;
  }
  return true;
}
