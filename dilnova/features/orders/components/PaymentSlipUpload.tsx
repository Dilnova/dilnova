'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadToCloudinary } from '@/shared/media/cloudinary-upload';
import { submitPaymentSlipAction } from '@/features/orders/customer.actions';

interface PaymentSlipUploadProps {
  orderId: string;
  customerEmail: string;
  existingSlipUrl?: string | null;
  disabled?: boolean;
  compact?: boolean;
}

export default function PaymentSlipUpload({
  orderId,
  customerEmail,
  existingSlipUrl,
  disabled = false,
  compact = false,
}: PaymentSlipUploadProps) {
  const [slipUrl, setSlipUrl] = useState(existingSlipUrl || '');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file (JPG, PNG, or WebP).' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be 8 MB or smaller.' });
      return;
    }

    setMessage(null);
    setUploadProgress(0);

    const upload = await uploadToCloudinary(file, (progress) => {
      setUploadProgress(progress.percent);
    });

    setUploadProgress(null);

    if (!upload.success || !upload.publicUrl) {
      setMessage({ type: 'error', text: upload.error || 'Failed to upload payment slip.' });
      return;
    }

    startTransition(async () => {
      const result = await submitPaymentSlipAction({
        orderId,
        slipUrl: upload.publicUrl!,
        customerEmail,
      });

      if (result.success) {
        setSlipUrl(upload.publicUrl!);
        setMessage({
          type: 'success',
          text: result.vendorNotified
            ? 'Payment slip submitted. Vendor admins were notified by email.'
            : 'Payment slip submitted. The vendor will review your transfer shortly.',
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save payment slip.' });
      }
    });
  };

  const isBusy = isPending || uploadProgress !== null;

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

      {slipUrl ? (
        <div className="space-y-3">
          <div className="relative w-full max-w-xs aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white">
            <Image
              src={slipUrl}
              alt="Uploaded payment slip"
              fill
              className="object-contain"
              sizes="320px"
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
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isBusy || disabled}
            onChange={handleFileChange}
            className="block w-full text-xs text-zinc-600 dark:text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-800 disabled:opacity-50"
          />
        </label>
      )}

      {uploadProgress !== null && (
        <p className="text-[11px] font-mono text-zinc-500">Uploading… {uploadProgress}%</p>
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
