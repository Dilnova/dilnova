"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  createPaymentSlipUploadPresignedUrlAction,
  submitPaymentSlipPathAction,
} from "@/features/orders/customer.actions";
import { PAYMENT_SLIP_ALLOWED_MIME_TYPES, type PaymentSlipMimeType } from "@/shared/storage/config";
import { toast } from "sonner";

interface PaymentSlipUploadProps {
  orderId: string;
  customerEmail: string;
  existingSlipPreviewUrl?: string | null;
  disabled?: boolean;
  compact?: boolean;
}

function isAllowedPaymentSlipFile(file: File): file is File & { type: PaymentSlipMimeType } {
  if ((PAYMENT_SLIP_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return true;
  }
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export default function PaymentSlipUpload({
  orderId,
  customerEmail: _customerEmail,
  existingSlipPreviewUrl,
  disabled = false,
  compact = false,
}: PaymentSlipUploadProps) {
  const [slipPreviewUrl, setSlipPreviewUrl] = useState(existingSlipPreviewUrl || "");
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedPaymentSlipFile(file)) {
      toast.error("Please upload an image file (JPG, PNG, WebP, or GIF).");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }

    startTransition(async () => {
      try {
        // 1. Request a pre-signed upload URL from the server
        const presignResult = await createPaymentSlipUploadPresignedUrlAction({
          orderId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type as PaymentSlipMimeType,
        });

        if (!presignResult?.data?.success) {
          toast.error(presignResult?.serverError || "Failed to initialize upload.");
          return;
        }

        const { signedUrl, storagePath } = presignResult.data;

        // 2. Upload file binary directly to Supabase storage
        const uploadResponse = await fetch(signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
          signal: AbortSignal.timeout(30000),
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(errText || "Failed to upload file to storage.");
        }

        // 3. Confirm path and submit the change to the database
        const submitResult = await submitPaymentSlipPathAction({
          orderId,
          storagePath,
        });

        if (submitResult?.data?.success) {
          if (submitResult.data.previewUrl) {
            setSlipPreviewUrl(submitResult.data.previewUrl);
          }
          toast.success("Payment slip submitted. The vendor will review your transfer shortly.");
        } else {
          toast.error(submitResult?.serverError || "Failed to save payment slip.");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Upload failed. Try a smaller image or refresh the page.",
        );
      } finally {
        event.target.value = "";
      }
    });
  };

  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 ${
        compact ? "p-4 space-y-3" : "p-5 space-y-4"
      }`}
    >
      <div>
        <h3
          className={`font-bold text-zinc-900 dark:text-zinc-100 ${compact ? "text-xs" : "text-sm"}`}
        >
          Upload Bank Payment Slip
        </h3>
        <p
          className={`text-zinc-500 dark:text-zinc-400 mt-1 ${compact ? "text-[11px]" : "text-xs"}`}
        >
          After you transfer payment, upload a photo or screenshot of your bank slip so the vendor
          can verify it.
        </p>
      </div>

      {slipPreviewUrl ? (
        <div className="space-y-3">
          <div className="relative w-full max-w-xs aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white">
            <Image
              src={slipPreviewUrl}
              alt="Uploaded payment slip"
              fill
              className="object-contain"
              sizes="320px"
              unoptimized
            />
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            Payment slip on file — awaiting vendor verification.
          </p>
        </div>
      ) : null}

      {!disabled && (
        <label className="block">
          <span className="sr-only">Choose payment slip image</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            disabled={isPending || disabled}
            onChange={handleFileChange}
            className="block w-full text-xs text-zinc-600 dark:text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-800 disabled:opacity-50"
          />
        </label>
      )}

      {isPending && (
        <p className="text-[11px] font-mono text-zinc-500">Uploading and saving payment slip…</p>
      )}
    </div>
  );
}
