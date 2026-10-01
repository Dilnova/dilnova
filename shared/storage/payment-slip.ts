import "server-only";

import {
  PAYMENT_SLIP_MIME_TO_EXT,
  PAYMENT_SLIP_SIGNED_URL_TTL_SECONDS,
  PAYMENT_SLIPS_BUCKET,
  type PaymentSlipMimeType,
} from "@/shared/storage/config";
import {
  createSupabaseAdminClient,
  isSupabaseStorageConfigured,
} from "@/shared/storage/admin-client";
import {
  buildPaymentSlipStoragePath,
  isAllowedImageMagicBytes,
  isLegacyPaymentSlipUrl,
  isPaymentSlipStoragePath,
} from "@/shared/storage/payment-slip.shared";

export {
  buildPaymentSlipStoragePath,
  detectImageMimeTypeFromMagicBytes,
  isAllowedImageMagicBytes,
  isLegacyPaymentSlipUrl,
  isPaymentSlipStoragePath,
  resolvePaymentSlipExtension,
  resolvePaymentSlipExtensionFromFilename,
} from "@/shared/storage/payment-slip.shared";

export async function uploadPaymentSlipToStorage(input: {
  orderId: string;
  bytes: Buffer;
  contentType: PaymentSlipMimeType;
}): Promise<string> {
  if (!isAllowedImageMagicBytes(input.bytes, input.contentType)) {
    throw new Error("Invalid image binary format: magic bytes do not match expected image type.");
  }

  const extension = PAYMENT_SLIP_MIME_TO_EXT[input.contentType];
  const storagePath = buildPaymentSlipStoragePath(input.orderId, extension);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(PAYMENT_SLIPS_BUCKET)
    .upload(storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Failed to upload payment slip to storage.");
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
  storedValue: string | null | undefined,
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
    throw new Error(error?.message || "Failed to generate signed upload URL.");
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
  const parts = storagePath.split("/");
  const folderPath = parts.slice(0, -1).join("/");
  const fileName = parts[parts.length - 1];

  const { data, error } = await supabase.storage
    .from(PAYMENT_SLIPS_BUCKET)
    .list(folderPath, { search: fileName });

  if (error || !data) {
    return false;
  }

  return data.some((file) => file.name === fileName);
}

export async function deletePaymentSlipFromStorage(storagePath: string): Promise<boolean> {
  if (!isPaymentSlipStoragePath(storagePath)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(PAYMENT_SLIPS_BUCKET).remove([storagePath]);

    return !error;
  } catch {
    return false;
  }
}

export async function verifyPaymentSlipMagicBytes(storagePath: string): Promise<boolean> {
  if (!isPaymentSlipStoragePath(storagePath)) {
    return false;
  }

  // 1. Attempt direct download via admin client (resilient against network/signed URL restrictions)
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage.from(PAYMENT_SLIPS_BUCKET).download(storagePath);

    if (!error && data) {
      const sliceBlob = data.slice(0, 32);
      const arrayBuffer = await sliceBlob.arrayBuffer();
      return isAllowedImageMagicBytes(new Uint8Array(arrayBuffer));
    }
  } catch {
    // Direct download might fail in tests or mock environments; fall through to signed URL approach
  }

  // 2. Fall back to fetching via signed URL with Range header
  const signedUrl = await createPaymentSlipSignedUrl(storagePath);
  if (!signedUrl) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(signedUrl, {
      headers: { Range: "bytes=0-31" },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return false;

    const buffer = await response.arrayBuffer();
    return isAllowedImageMagicBytes(new Uint8Array(buffer));
  } catch {
    return false;
  }
}
