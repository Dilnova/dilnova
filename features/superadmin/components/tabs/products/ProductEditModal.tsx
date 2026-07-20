'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/shared/media/cloudinary-upload';
import { updateProductAction } from '@/features/catalog/superadmin.actions';
import type { Product, Category } from '../ProductsTab';

interface ProductEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  maxMediaLimit: number;
}

export function ProductEditModal({
  product,
  isOpen,
  onClose,
  categories,
  maxMediaLimit,
}: ProductEditModalProps) {
  const [isPending, startTransition] = useTransition();

  const [editProdName, setEditProdName] = useState(product.name);
  const [editProdPrice, setEditProdPrice] = useState(product.price / 100);
  const [editProdCategory, setEditProdCategory] = useState(product.categoryId || '');
  const [editProdDesc, setEditProdDesc] = useState(product.description || '');
  const [editProdType, setEditProdType] = useState<'product' | 'service'>(product.type as 'product' | 'service');
  const [editProdMedia, setEditProdMedia] = useState<{ url: string; type: 'image' | 'video' }[]>(product.media || []);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditProdName(product.name);
      setEditProdPrice(product.price / 100);
      setEditProdCategory(product.categoryId || '');
      setEditProdDesc(product.description || '');
      setEditProdType(product.type as 'product' | 'service');
      setEditProdMedia(product.media || []);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editProdMedia.length >= maxMediaLimit) {
      triggerNotification(false, `Maximum media upload limit of ${maxMediaLimit} reached.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      triggerNotification(false, 'File size exceeds 10MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileType = file.type.startsWith('video/') ? ('video' as const) : ('image' as const);

    try {
      const result = await uploadToCloudinary(file, {
        uploadKind: 'platform',
        onProgress: (progress) => {
          setUploadProgress(progress.percent);
        },
      });

      if (result.success && result.publicUrl) {
        const newItem = { url: result.publicUrl, type: fileType };
        setEditProdMedia((prev) => [...prev, newItem]);
        triggerNotification(true, `${fileType === 'video' ? 'Video' : 'Image'} uploaded!`);
      } else {
        triggerNotification(false, result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error', err);
      triggerNotification(false, 'An error occurred during media upload.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveProductMedia = (index: number) => {
    setEditProdMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const primaryThumbnail = editProdMedia[0]?.url || '';
        await updateProductAction(product.id, {
          name: editProdName,
          price: Math.round(editProdPrice * 100),
          categoryId: editProdCategory || null,
          description: editProdDesc,
          type: editProdType,
          imageUrl: primaryThumbnail,
          media: editProdMedia,
        });
        triggerNotification(true, 'Product updated successfully.');
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save product.';
        triggerNotification(false, msg);
      }
    });
  };

  const renderCategoryOptions = () => {
    const mainCats = categories.filter((c) => !c.parentId);
    return (
      <>
        <option value="">Uncategorized</option>
        {mainCats.map((main) => {
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
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40 overflow-y-auto pt-10 sm:pt-0" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl safe-area-bottom mt-auto sm:mt-0 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-900 flex-shrink-0">
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            ✏️ Edit Listing
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-normal">
              ID: {product.id.slice(0, 8)}...
            </span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Listing Name</label>
              <input
                required
                type="text"
                maxLength={150}
                value={editProdName}
                onChange={(e) => setEditProdName(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Price (USD)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={editProdPrice}
                onChange={(e) => setEditProdPrice(parseFloat(e.target.value))}
                className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Category</label>
              <select
                value={editProdCategory}
                onChange={(e) => setEditProdCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 appearance-none"
              >
                {renderCategoryOptions()}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Type</label>
              <select
                value={editProdType}
                onChange={(e) => setEditProdType(e.target.value as 'product' | 'service')}
                className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 appearance-none"
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Description</label>
            <textarea
              rows={4}
              value={editProdDesc}
              onChange={(e) => setEditProdDesc(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
              placeholder="Describe the listing..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🖼️</span> Media Files
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">{editProdMedia.length}/{maxMediaLimit} utilized</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {editProdMedia.map((m, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 group">
                  {m.type === 'video' ? (
                    <video src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={m.url} alt="Media" fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveProductMedia(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  >
                    ✕
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded">
                      PRIMARY
                    </span>
                  )}
                </div>
              ))}
              
              {editProdMedia.length < maxMediaLimit && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold">{uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">➕</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Add File</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              className="hidden"
              ref={fileInputRef}
              onChange={handleProductFileUpload}
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="flex-1 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
