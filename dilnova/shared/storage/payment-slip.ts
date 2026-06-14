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
    return storedValue;
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
