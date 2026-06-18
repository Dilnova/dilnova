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

