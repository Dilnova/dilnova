import 'server-only';

import {
  PAYMENT_SLIP_MIME_TO_EXT,
  PAYMENT_SLIP_SIGNED_URL_TTL_SECONDS,
  PAYMENT_SLIPS_BUCKET,
  type PaymentSlipMimeType,
} from '@/shared/storage/config';
import { createSupabaseAdminClient, isSupabaseStorageConfigured } from '@/shared/storage/admin-client';
import {
  buildPaymentSlipStoragePath,
  isLegacyPaymentSlipUrl,
  isPaymentSlipStoragePath,
} from '@/shared/storage/payment-slip.shared';

export {
  buildPaymentSlipStoragePath,
  isLegacyPaymentSlipUrl,
  isPaymentSlipStoragePath,
  resolvePaymentSlipExtension,
  resolvePaymentSlipExtensionFromFilename,
} from '@/shared/storage/payment-slip.shared';

export async function uploadPaymentSlipToStorage(input: {
  orderId: string;
  bytes: Buffer;
  contentType: PaymentSlipMimeType;
}): Promise<string> {
  const extension = PAYMENT_SLIP_MIME_TO_EXT[input.contentType];
  const storagePath = buildPaymentSlipStoragePath(input.orderId, extension);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage.from(PAYMENT_SLIPS_BUCKET).upload(storagePath, input.bytes, {
    contentType: input.contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Failed to upload payment slip to storage.');
  }

  return storagePath;
}

export async function createPaymentSlipSignedUrl(storagePath: string): Promise<string | null> {
  if (!isPaymentSlipStoragePath(storagePath)) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PAYMENT_SLIPS_BUCKET)
    .createSignedUrl(storagePath, PAYMENT_SLIP_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function resolvePaymentSlipPreviewUrl(
  storedValue: string | null | undefined
): Promise<string | null> {
  if (!storedValue) {
    return null;
  }

  if (isLegacyPaymentSlipUrl(storedValue)) {
    // Stop returning raw public URLs to prevent unauthorized public access
    return null;
  }

  if (!isSupabaseStorageConfigured()) {
    return null;
  }

  try {
    return await createPaymentSlipSignedUrl(storedValue);
  } catch {
    return null;
  }
}

export async function createPaymentSlipSignedUploadUrl(input: {
  orderId: string;
  contentType: PaymentSlipMimeType;
}): Promise<{ signedUrl: string; storagePath: string }> {
  const extension = PAYMENT_SLIP_MIME_TO_EXT[input.contentType];
  const storagePath = buildPaymentSlipStoragePath(input.orderId, extension);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(PAYMENT_SLIPS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Failed to generate signed upload URL.');
  }

  return {
    signedUrl: data.signedUrl,
    storagePath,
  };
}

export async function verifyPaymentSlipFileExists(storagePath: string): Promise<boolean> {
  if (!isPaymentSlipStoragePath(storagePath)) {
    return false;
  }

  const supabase = createSupabaseAdminClient();
  const parts = storagePath.split('/');
  const folderPath = parts.slice(0, -1).join('/');
  const fileName = parts[parts.length - 1];

  const { data, error } = await supabase.storage
    .from(PAYMENT_SLIPS_BUCKET)
    .list(folderPath, { search: fileName });

  if (error || !data) {
    return false;
  }

  return data.some((file) => file.name === fileName);
}

export async function verifyPaymentSlipMagicBytes(storagePath: string): Promise<boolean> {
  const signedUrl = await createPaymentSlipSignedUrl(storagePath);
  if (!signedUrl) return false;

  try {
    const response = await fetch(signedUrl, {
      headers: { Range: 'bytes=0-31' },
    });
    if (!response.ok) return false;

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
    
    // JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    
    // GIF: GIF87a or GIF89a
    const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
    
    // WebP: RIFF ... WEBP
    const isWebP = bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

    return isPng || isJpeg || isGif || isWebP;
  } catch {
    return false;
  }
}

