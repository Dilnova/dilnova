'use client';

import { logger } from '@/shared/logging/logger';
import { useState, useTransition, useRef } from 'react';
import { updateVendorMetadata } from '@/features/vendor/actions';
import { uploadToCloudinary } from '@/shared/media/cloudinary-upload';
import { toast } from 'sonner';
import Image from 'next/image';

interface VendorProfileFormProps {
  orgId: string;
  initialMetadata: {
    description?: string;
    address?: string;
    phone?: string;
    bannerUrl?: string;
    stockAllocationMode?: 'target_branch' | 'central_intake';
    bankName?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankBranchCode?: string;
    bankTransferInstructions?: string;
  };
  isAdmin?: boolean;
}

export default function VendorProfileForm({ orgId, initialMetadata, isAdmin = false }: VendorProfileFormProps) {
  const [description, setDescription] = useState(initialMetadata.description || '');
  const [address, setAddress] = useState(initialMetadata.address || '');
  const [phone, setPhone] = useState(initialMetadata.phone || '');
  const [bannerUrl, setBannerUrl] = useState(initialMetadata.bannerUrl || '');
  const [stockAllocationMode, setStockAllocationMode] = useState<'target_branch' | 'central_intake'>(
    initialMetadata.stockAllocationMode || 'central_intake'
  );
  const [bankName, setBankName] = useState(initialMetadata.bankName || '');
  const [bankAccountName, setBankAccountName] = useState(initialMetadata.bankAccountName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(initialMetadata.bankAccountNumber || '');
  const [bankBranchCode, setBankBranchCode] = useState(initialMetadata.bankBranchCode || '');
  const [bankTransferInstructions, setBankTransferInstructions] = useState(
    initialMetadata.bankTransferInstructions || ''
  );

  const [isPending, startTransition] = useTransition();
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const bannerCameraInputRef = useRef<HTMLInputElement>(null);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Banner image exceeds 10MB limit.');
      return;
    }

    setIsBannerUploading(true);
    setBannerUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, {
        uploadKind: 'vendor-profile',
        onProgress: (progress) => {
          setBannerUploadProgress(progress.percent);
        },
      });

      if (result.success && result.publicUrl) {
        setBannerUrl(result.publicUrl);
        toast.success('Banner image uploaded! Save profile to apply changes.');
      } else {
        toast.error(result.error || 'Banner upload failed.');
      }
    } catch (err) {
      logger.error('Error', err);
      toast.error('An error occurred during banner upload.');
    } finally {
      setIsBannerUploading(false);
      setBannerUploadProgress(null);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
      if (bannerCameraInputRef.current) bannerCameraInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const result = await updateVendorMetadata(orgId, {
          description,
          address,
          phone,
          bannerUrl,
          stockAllocationMode,
          bankName,
          bankAccountName,
          bankAccountNumber,
          bankBranchCode,
          bankTransferInstructions,
        });
        if (result.success) {
          toast.success('Storefront profile updated successfully!');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update profile settings.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
          Store Banner Image
        </label>

        {bannerUrl ? (
          <div className="space-y-3">
            <div className="relative h-32 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
              <Image
                src={bannerUrl}
                alt="Storefront Banner Preview"
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                <span className="text-[10px] text-white font-mono bg-zinc-900/60 px-2 py-0.5 rounded">
                  Banner Preview
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => bannerFileInputRef.current?.click()}
                disabled={isBannerUploading}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:hover:bg-purple-900/30 dark:text-purple-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Replace Image
              </button>
              <button
                type="button"
                onClick={() => setBannerUrl('')}
                disabled={isBannerUploading}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => bannerCameraInputRef.current?.click()}
              disabled={isBannerUploading}
              className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
            >
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                {isBannerUploading ? 'Uploading...' : 'Take Photo'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => bannerFileInputRef.current?.click()}
              disabled={isBannerUploading}
              className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-950/30 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
            >
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                {isBannerUploading ? 'Uploading...' : 'Add Image'}
              </span>
            </button>
          </div>
        )}

        <input
          type="file"
          ref={bannerFileInputRef}
          onChange={handleBannerUpload}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={bannerCameraInputRef}
          onChange={handleBannerUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {isBannerUploading && bannerUploadProgress !== null && (
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all"
              style={{ width: `${bannerUploadProgress}%` }}
            />
          </div>
        )}

        <p className="text-[10px] text-zinc-400 font-mono">
          Upload a wide photo for your store header. PNG, JPG, or WEBP (max 10MB).
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
          Store Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Tell customers about your business, specialties, and support hours..."
          className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 transition-shadow"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Contact Phone Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 font-mono transition-shadow"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Business Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Enterprise Rd, Suite B"
            className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 transition-shadow"
          />
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-900">
          <div>
            <h4 className="text-sm font-bold text-zinc-805 dark:text-zinc-150">Bank Transfer Details</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Shown to customers after checkout when they pay by bank transfer. Stored in private organization metadata — not visible to cashiers or other org members.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Commercial Bank"
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 transition-shadow"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                Account Name
              </label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Registered account holder name"
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 transition-shadow"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                Account Number
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="1234567890"
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 font-mono transition-shadow"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                Branch / Sort Code (optional)
              </label>
              <input
                type="text"
                value={bankBranchCode}
                onChange={(e) => setBankBranchCode(e.target.value)}
                placeholder="Branch code or SWIFT"
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 font-mono transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
              Additional Instructions (optional)
            </label>
            <textarea
              value={bankTransferInstructions}
              onChange={(e) => setBankTransferInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. Use your order reference in the transfer description."
              className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 transition-shadow"
            />
          </div>
        </div>
      )}

      {/* Stock Allocation Settings — Only editable/visible by Org Admin */}
      {isAdmin && (
        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-900">
          <div>
            <h4 className="text-sm font-bold text-zinc-805 dark:text-zinc-150">Stock Allocation Configuration</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Choose how your organization allocates initial stock when listing new products.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStockAllocationMode('central_intake')}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                stockAllocationMode === 'central_intake'
                  ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-355'
                  : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50/50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
              }`}
            >
              <span className="font-bold text-xs">🏢 Central Intake & Manual Distribution</span>
              <span className="text-[10px] opacity-80 mt-1 leading-relaxed">
                New stock is deposited into the Main/Default branch. Other branches start at 0, and the admin distributes it manually from the inventory workspace.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStockAllocationMode('target_branch')}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                stockAllocationMode === 'target_branch'
                  ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-355'
                  : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50/50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
              }`}
            >
              <span className="font-bold text-xs">🎯 Destination Branch Selector</span>
              <span className="text-[10px] opacity-80 mt-1 leading-relaxed">
                {"A 'Destination Branch' dropdown shows on the Add Item page. Initial stock goes directly to the chosen branch registry."}
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-end">
        <button
          type="submit"
          disabled={isPending || isBannerUploading}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-6 py-3 sm:py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm sm:text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-purple-900/10 flex items-center justify-center"
        >
          {isPending ? 'Saving storefront settings...' : 'Save Profile Settings'}
        </button>
      </div>
    </form>
  );
}
