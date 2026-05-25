'use client';

import { useState, useTransition } from 'react';
import { updateVendorMetadata } from './actions';

interface VendorProfileFormProps {
  orgId: string;
  initialMetadata: {
    description?: string;
    address?: string;
    phone?: string;
    bannerUrl?: string;
  };
}

export default function VendorProfileForm({ orgId, initialMetadata }: VendorProfileFormProps) {
  const [description, setDescription] = useState(initialMetadata.description || '');
  const [address, setAddress] = useState(initialMetadata.address || '');
  const [phone, setPhone] = useState(initialMetadata.phone || '');
  const [bannerUrl, setBannerUrl] = useState(initialMetadata.bannerUrl || '');

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await updateVendorMetadata(orgId, {
          description,
          address,
          phone,
          bannerUrl,
        });
        if (result.success) {
          setMessage({ type: 'success', text: 'Storefront profile updated successfully!' });
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Failed to update profile settings.' });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg text-sm font-mono border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/50'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Banner Preview If Exists */}
      {bannerUrl && (
        <div className="relative h-32 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
          <img
            src={bannerUrl}
            alt="Storefront Banner Preview"
            className="w-full h-full object-cover"
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
      )}

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
          Banner Image URL
        </label>
        <input
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://images.unsplash.com/photo-..."
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
        />
        <p className="text-[10px] text-zinc-400 font-mono">
          Provide a public image URL (Unsplash, etc.) to set as your store header.
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
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
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
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-purple-900/10"
        >
          {isPending ? 'Saving storefront settings...' : 'Save Profile Settings'}
        </button>
      </div>
    </form>
  );
}
