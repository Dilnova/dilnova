'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { addProductAction } from '../actions';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CategorySelector from '@/app/components/CategorySelector';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface AddProductClientProps {
  categories: Category[];
  maxMediaLimit: number;
}

export default function AddProductClient({
  categories,
  maxMediaLimit,
}: AddProductClientProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'service'>('product');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantity, setQuantity] = useState('0');
  
  // Media Upload State (multiple files)
  const [media, setMedia] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTips, setShowTips] = useState(false);

  // Auto-dismiss success/error toasts
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // File Upload Handler using Cloudinary utility
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process files one by one
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      if (media.length + i >= maxMediaLimit) {
        setMessage({ type: 'error', text: `Maximum media upload limit of ${maxMediaLimit} reached.` });
        break;
      }

      // Enforce 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: `"${file.name}" exceeds 10MB limit.` });
        continue;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setMessage(null);

      const fileType = file.type.startsWith('video/') ? ('video' as const) : ('image' as const);

      try {
        const result = await uploadToCloudinary(file, (progress) => {
          setUploadProgress(progress.percent);
        });

        if (result.success && result.publicUrl) {
          const newItem = { url: result.publicUrl, type: fileType };
          setMedia((prev) => [...prev, newItem]);
          setMessage({ type: 'success', text: `${fileType === 'video' ? 'Video' : 'Image'} uploaded!` });
        } else {
          setMessage({ type: 'error', text: result.error || 'Upload failed' });
        }
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Upload error. Please try again.' });
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }

    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Item name is required.' });
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive price.' });
      return;
    }

    let quantityNum = 0;
    if (type === 'product') {
      quantityNum = parseInt(quantity, 10);
      if (isNaN(quantityNum) || quantityNum < 0) {
        setMessage({ type: 'error', text: 'Please enter a valid non-negative quantity.' });
        return;
      }
    }

    startTransition(async () => {
      try {
        const primaryThumbnail = media[0]?.url || '';
        const result = await addProductAction({
          name,
          type,
          description,
          priceInDollars: priceNum,
          imageUrl: primaryThumbnail,
          media: media,
          categoryId,
          quantity: type === 'product' ? quantityNum : undefined,
        });

        if (result.success) {
          setMessage({ type: 'success', text: `✅ "${name}" added successfully!` });

          // Reset Form Fields
          setName('');
          setDescription('');
          setPrice('');
          setCategoryId('');
          setMedia([]);
          setQuantity('0');

          // Scroll to top on mobile after success
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add item.' });
      }
    });
  };

  return (
    <div className="relative pb-24 sm:pb-6">
      {/* Floating Toast Notification */}
      {message && (
        <div
          className={`fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-[60] p-3.5 rounded-xl text-xs font-semibold border shadow-xl backdrop-blur-lg transition-all duration-300 ${
            message.type === 'success'
              ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-400 dark:border-emerald-900/50'
              : 'bg-rose-50/95 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-400 dark:border-rose-900/50'
          }`}
          style={{ animation: 'mobileMenuSlideDown 0.25s ease-out' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-current opacity-60 hover:opacity-100 p-1 cursor-pointer"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
        {/* Main Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleAddItem} className="space-y-5">
            
            {/* ── Section 1: Type + Name (most critical, top of form) ── */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">1</span>
                Basic Details
              </h2>

              {/* Type Selector — large touch targets */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setType('product')}
                  className={`flex items-center justify-center gap-2 py-3.5 sm:py-2.5 rounded-xl text-sm sm:text-xs font-semibold border transition-all cursor-pointer active:scale-[0.97] ${
                    type === 'product'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-350'
                      : 'bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  🛒 Product
                </button>
                <button
                  type="button"
                  onClick={() => setType('service')}
                  className={`flex items-center justify-center gap-2 py-3.5 sm:py-2.5 rounded-xl text-sm sm:text-xs font-semibold border transition-all cursor-pointer active:scale-[0.97] ${
                    type === 'service'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-350'
                      : 'bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  🛠️ Service
                </button>
              </div>

              {/* Name — large input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Premium Garden Hose"
                  required
                  autoComplete="off"
                  className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
                />
              </div>

              {/* Price, Category & Quantity — stacked on mobile, grid layout on larger screens */}
              <div className={`grid grid-cols-1 ${type === 'product' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Price (USD) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="29.99"
                      required
                      className="w-full pl-8 pr-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 font-mono transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Category
                  </label>
                  <CategorySelector
                    categories={categories}
                    selectedId={categoryId}
                    onChange={setCategoryId}
                  />
                </div>

                {type === 'product' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      Initial Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 font-mono transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 2: Description ── */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                Description
              </h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Details about product materials, sizes, or service inclusions..."
                className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all resize-y min-h-[80px]"
              />
            </div>

            {/* ── Section 3: Media Upload ── */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
                  Photos & Videos
                </h2>
                <span className="text-xs font-mono text-zinc-400">
                  {media.length}/{maxMediaLimit}
                </span>
              </div>

              {/* Uploaded Media Gallery — horizontal scroll on mobile */}
              {media.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                  {media.map((item, index) => (
                    <div
                      key={index}
                      className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 snap-start"
                    >
                      {item.type === 'video' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-300 p-1 text-center">
                          <span className="text-2xl">🎬</span>
                          <span className="text-[9px] font-mono mt-1">Video</span>
                        </div>
                      ) : (
                        <Image
                          src={item.url}
                          alt="Gallery item preview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 96px, 112px"
                        />
                      )}
                      {/* Delete button — large enough for thumb tap */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs cursor-pointer transition-all shadow-lg active:scale-90"
                        title="Remove media"
                      >
                        ✕
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 bg-purple-700/90 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Buttons — Two large buttons for mobile: Camera + Gallery */}
              {media.length < maxMediaLimit && (
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Camera Capture (mobile-first) */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex flex-col items-center justify-center gap-1.5 py-5 sm:py-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
                  >
                    <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Camera
                    </span>
                  </button>

                  {/* Gallery / File Picker */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex flex-col items-center justify-center gap-1.5 py-5 sm:py-4 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-950/30 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
                  >
                    <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      Gallery
                    </span>
                  </button>
                </div>
              )}

              <p className="text-[10px] text-zinc-400 text-center font-mono">
                PNG, JPG, WEBP, or MP4 • Max 10MB each
              </p>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*"
                multiple
                className="hidden"
              />

              {/* Upload Progress Bar */}
              {isUploading && uploadProgress !== null && (
                <div className="space-y-1.5 px-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                      Uploading...
                    </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Desktop Submit Button (hidden on mobile, shown on sm+) ── */}
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="hidden sm:flex w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-purple-900/15 items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Catalog Item
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Sidebar: Tips (collapsible on mobile) */}
        <div className="lg:col-span-2 space-y-3">
          {/* Tips Card — collapsible accordion on mobile */}
          <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer sm:cursor-default text-left"
            >
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                <span>💡</span> Tips for Great Listings
              </h3>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 sm:hidden ${showTips ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`px-4 sm:px-5 pb-4 sm:pb-5 ${showTips ? 'block' : 'hidden sm:block'}`}>
              <ul className="space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>Use clear, descriptive names that customers will search for.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>Add multiple media files — the first one becomes the primary thumbnail.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>Write detailed descriptions including materials, sizes, and key features.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>Select the most specific category to help customers find your items.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>Keep images under 10MB and use high-quality photos with good lighting.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Limits Card */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-900/40 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
              <span>📊</span> Upload Limits
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Max media per item</span>
                <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{maxMediaLimit}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Max file size</span>
                <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">10 MB</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-500 dark:text-zinc-400">Accepted formats</span>
                <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">PNG, JPG, WEBP, MP4</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Mobile Submit Button ── */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 safe-area-bottom">
        <button
          type="button"
          onClick={(e) => {
            // Find and submit the form
            const form = document.querySelector('form');
            if (form) {
              form.requestSubmit();
            }
          }}
          disabled={isPending || isUploading}
          className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 active:scale-[0.97]"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving...
            </>
          ) : isUploading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Uploading Media...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Catalog Item
            </>
          )}
        </button>
      </div>
    </div>
  );
}
