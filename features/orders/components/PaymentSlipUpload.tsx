'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { createPaymentSlipUploadPresignedUrlAction, submitPaymentSlipPathAction } from '@/features/orders/customer.actions';

interface PaymentSlipUploadProps {
  orderId: string;
  customerEmail: string;
  existingSlipPreviewUrl?: string | null;
  disabled?: boolean;
  compact?: boolean;
}

function isAllowedPaymentSlipFile(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return true;
  }
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export default function PaymentSlipUpload({
  orderId,
  customerEmail,
  existingSlipPreviewUrl,
  disabled = false,
  compact = false,
}: PaymentSlipUploadProps) {
  const [slipPreviewUrl, setSlipPreviewUrl] = useState(existingSlipPreviewUrl || '');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedPaymentSlipFile(file)) {
      setMessage({ type: 'error', text: 'Please upload an image file (JPG, PNG, WebP, or GIF).' });
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be 8 MB or smaller.' });
      event.target.value = '';
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        // 1. Request a pre-signed upload URL from the server
        const presignResult = await createPaymentSlipUploadPresignedUrlAction({
          orderId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });

        if (!presignResult.success) {
          setMessage({ type: 'error', text: presignResult.error || 'Failed to initialize upload.' });
          return;
        }

        const { signedUrl, storagePath } = presignResult;

        // 2. Upload file binary directly to Supabase storage
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(errText || 'Failed to upload file to storage.');
        }

        // 3. Confirm path and submit the change to the database
        const submitResult = await submitPaymentSlipPathAction({
          orderId,
          storagePath,
        });

        if (submitResult.success) {
          if (submitResult.previewUrl) {
            setSlipPreviewUrl(submitResult.previewUrl);
          }
          setMessage({
            type: 'success',
            text: 'Payment slip submitted. The vendor will review your transfer shortly.',
          });
        } else {
          setMessage({ type: 'error', text: submitResult.error || 'Failed to save payment slip.' });
        }
      } catch (error) {
        setMessage({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Upload failed. Try a smaller image or refresh the page.',
        });
      } finally {
        event.target.value = '';
      }
    });
  };

  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 ${
        compact ? 'p-4 space-y-3' : 'p-5 space-y-4'
      }`}
    >
      <div>
        <h3 className={`font-bold text-zinc-900 dark:text-zinc-100 ${compact ? 'text-xs' : 'text-sm'}`}>
          Upload Bank Payment Slip
        </h3>
        <p className={`text-zinc-500 dark:text-zinc-400 mt-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          After you transfer payment, upload a photo or screenshot of your bank slip so the vendor can verify it.
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

      {message && (
        <p
          className={`text-[11px] rounded-lg px-3 py-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
