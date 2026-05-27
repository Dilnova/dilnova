'use client';

import { useState, useTransition, useRef } from 'react';
import { addProductAction, deleteProductAction } from './actions';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import Image from 'next/image';

export interface Product {
  id: string;
  name: string;
  type: string; // 'product' | 'service'
  description: string | null;
  price: number;
  imageUrl: string | null;
  media?: { url: string; type: 'image' | 'video' }[] | null;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface ManageProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
  maxMediaLimit: number;
}

export default function ManageProductsClient({
  initialProducts,
  categories,
  maxMediaLimit,
}: ManageProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'service'>('product');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  // Media Upload State (multiple files)
  const [media, setMedia] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File Upload Handler using our Cloudinary utility
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (media.length >= maxMediaLimit) {
      setMessage({ type: 'error', text: `Maximum media upload limit of ${maxMediaLimit} reached.` });
      return;
    }

    // Enforce 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size exceeds 10MB limit.' });
      return;
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
        setMessage({ type: 'success', text: `${fileType === 'video' ? 'Video' : 'Image'} uploaded successfully to Cloudinary!` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Upload failed' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'An error occurred during media upload.' });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        });

        if (result.success) {
          setMessage({ type: 'success', text: `Successfully added ${name}!` });
          
          // Optimistically append the product locally
          const newProduct: Product = {
            id: crypto.randomUUID(), // temp ID for local view
            name,
            type,
            description,
            price: Math.round(priceNum * 100),
            imageUrl: primaryThumbnail || null,
            media: media,
            categoryId: categoryId || null,
          };
          setProducts([newProduct, ...products]);

          // Reset Form Fields
          setName('');
          setDescription('');
          setPrice('');
          setCategoryId('');
          setMedia([]);
        }
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add item.' });
      }
    });
  };

  const handleDeleteItem = (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    startTransition(async () => {
      try {
        const result = await deleteProductAction(id);
        if (result.success) {
          setMessage({ type: 'success', text: `Deleted "${itemName}".` });
          setProducts(products.filter((p) => p.id !== id));
        }
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete item.' });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 1. Left / Center Column: Product Listing */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
            Catalog Directory
            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full font-mono font-medium">
              {products.length} Items
            </span>
          </h2>

          {products.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-200 rounded-xl dark:border-zinc-800">
              <p className="text-zinc-400 text-sm">No products or services found in your catalog.</p>
              <p className="text-zinc-500 text-xs mt-1">Use the panel on the right to list your first item!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between border border-zinc-200 rounded-xl p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:shadow-md transition-all"
                >
                  <div>
                    {/* Image Preview */}
                    <div className="relative w-full h-32 bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden mb-3 border border-zinc-200/55 dark:border-zinc-800">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 font-mono">
                          No Image Provided
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        {/* Type Tag */}
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full font-mono shadow-sm ${
                          item.type === 'service' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-350' 
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-350'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 min-h-[2rem]">
                      {item.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-mono">Price</span>
                      <strong className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 font-mono">
                        ${(item.price / 100).toFixed(2)}
                      </strong>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Column: Form Panel */}
      <div className="space-y-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Create Catalog Item</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add products or services to your public store catalog.
            </p>
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-lg text-xs font-mono border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/50'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleAddItem} className="space-y-4">
            {/* Type Selector (Product vs Service) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                Catalog Item Classification
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('product')}
                  className={`py-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    type === 'product'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-350'
                      : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  🛒 Product
                </button>
                <button
                  type="button"
                  onClick={() => setType('service')}
                  className={`py-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    type === 'service'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-350'
                      : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  🛠️ Service
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                Item Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium Garden Hose"
                required
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Price & Category Dropdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                  Price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="29.99"
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Category</option>
                  {categories
                    .filter((c) => !c.parentId)
                    .map((main) => {
                      const subs = categories.filter((c) => c.parentId === main.id);
                      return (
                        <optgroup key={main.id} label={main.name}>
                          <option value={main.id}>{main.name} (All)</option>
                          {subs.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                Item Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Details about product materials, sizes, or service inclusions..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
                        {/* Cloudinary Gallery Upload */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                Cloudinary Media Gallery
              </label>

              {/* Uploaded Gallery Grid */}
              {media.length > 0 && (
                <div className="grid grid-cols-3 gap-2 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  {media.map((item, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border border-zinc-250 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                    >
                      {item.type === 'video' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-300 p-1 text-center">
                          <span className="text-xl">🎬</span>
                          <span className="text-[8px] font-mono mt-1 truncate max-w-full">Video</span>
                        </div>
                      ) : (
                        <Image
                          src={item.url}
                          alt="Gallery item preview"
                          fill
                          className="object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[8px] px-1 py-0.5 cursor-pointer transition-all shadow"
                        title="Remove media"
                      >
                        ✕
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-purple-700/90 text-white text-[7px] px-1 py-0.5 rounded font-bold uppercase tracking-wide">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Drop Zone / Button */}
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col items-center justify-center gap-2">
                <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || media.length >= maxMediaLimit}
                    className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {isUploading 
                      ? 'Uploading to Cloudinary...' 
                      : media.length >= maxMediaLimit
                        ? `Media Limit Reached (${maxMediaLimit})`
                        : `Click to Add Media (${media.length}/${maxMediaLimit})`}
                  </button>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">PNG, JPG, WEBP, or MP4 (Max 10MB)</p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </div>

              {/* Upload Progress Bar */}
              {isUploading && uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>Direct Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>  </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-purple-900/10"
            >
              {isPending ? 'Saving to Database...' : 'Add Catalog Item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
