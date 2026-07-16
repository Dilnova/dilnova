'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/notifications';
import { uploadToCloudinary } from '@/shared/media/cloudinary-upload';
import { updateProductAction, deleteProductAction } from '@/features/catalog/superadmin.actions';

export interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  orgId: string;
  categoryId: string | null;
  views: number;
  categoryName: string | null;
  createdAt: Date;
  media?: { url: string; type: 'image' | 'video' }[] | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
}

interface Organization {
  id: string;
  name: string;
}

interface ProductsTabProps {
  products: Product[];
  categories: Category[];
  organizations: Organization[];
  maxMediaLimit: number;
}

export default function ProductsTab({ products, categories, organizations, maxMediaLimit }: ProductsTabProps) {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdPrice, setEditProdPrice] = useState(0);
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdType, setEditProdType] = useState<'product' | 'service'>('product');
  const [editProdMedia, setEditProdMedia] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditProdName(prod.name);
    setEditProdPrice(prod.price / 100);
    setEditProdCategory(prod.categoryId || '');
    setEditProdDesc(prod.description || '');
    setEditProdType(prod.type as 'product' | 'service');
    setEditProdMedia(prod.media || []);
    setIsProductModalOpen(true);
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
    if (!editingProduct) return;

    startTransition(async () => {
      try {
        const primaryThumbnail = editProdMedia[0]?.url || '';
        await updateProductAction(editingProduct.id, {
          name: editProdName,
          price: Math.round(editProdPrice * 100),
          categoryId: editProdCategory || null,
          description: editProdDesc,
          type: editProdType,
          imageUrl: primaryThumbnail,
          media: editProdMedia,
        });
        triggerNotification(true, 'Product updated successfully.');
        setIsProductModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save product.';
        triggerNotification(false, msg);
      }
    });
  };

  const handleDeleteProduct = async (prodId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Product',
      message: 'Are you sure you want to permanently delete this product/service? This action is irreversible.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    toast.promise(
      deleteProductAction(prodId),
      {
        loading: 'Deleting product...',
        success: 'Product deleted.',
        error: (err) => err instanceof Error ? err.message : 'Failed to delete product.'
      }
    );
  };

  const renderCategoryOptions = (includeAllOption = false) => {
    const mainCats = categories.filter((c) => !c.parentId);
    return (
      <>
        <option value={includeAllOption ? 'all' : ''}>
          {includeAllOption ? 'All Categories' : 'Uncategorized'}
        </option>
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

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase())) ||
      p.id.includes(productSearch);

    const matchesType = productTypeFilter === 'all' || p.type === productTypeFilter;
    const matchesCategory =
      productCategoryFilter === 'all' || p.categoryId === productCategoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const knownOrgIds = new Set(organizations.map((org) => org.id));
  const orgNameById = new Map(organizations.map((org) => [org.id, org.name]));

  return (
    <div className="space-y-4">
      {isPending && (
        <div className="fixed inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-5 py-3 rounded-xl shadow-2xl text-xs font-mono font-bold tracking-wider flex items-center gap-2.5">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            SAVING...
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Global Product Moderator</h2>
        <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5 hidden sm:block">Moderate or edit all catalog entries across vendors</p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name, ID..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
          />
          {productSearch && (
            <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer" aria-label="Clear">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={productTypeFilter}
            onChange={(e) => setProductTypeFilter(e.target.value as 'all' | 'product' | 'service')}
            className="px-3 py-2.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none appearance-none flex-1 sm:flex-none"
          >
            <option value="all">All Types</option>
            <option value="product">Products</option>
            <option value="service">Services</option>
          </select>
          <select
            value={productCategoryFilter}
            onChange={(e) => setProductCategoryFilter(e.target.value)}
            className="px-3 py-2.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none appearance-none flex-1 sm:flex-none"
          >
            {renderCategoryOptions(true)}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-zinc-400 font-mono px-1">
        {filteredProducts.length} of {products.length} items
      </p>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-zinc-200 rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider bg-zinc-50/50 dark:bg-zinc-900/30">
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Views</th>
                <th className="py-3 px-4">Vendor Org</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className="py-4 px-4">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{p.name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate max-w-[220px]">
                      Cat: {p.categoryName || 'Uncategorized'}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      p.type === 'service' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                    }`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold">${(p.price / 100).toFixed(2)}</td>
                  <td className="py-4 px-4 font-mono text-zinc-600 dark:text-zinc-400">👀 {p.views}</td>
                  <td className="py-4 px-4">
                    <div className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400 truncate max-w-[140px]">
                      {orgNameById.get(p.orgId) || 'Unknown Vendor'}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[140px]">
                      {p.orgId}
                    </div>
                    {!knownOrgIds.has(p.orgId) && (
                      <span className="inline-flex mt-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300">
                        Missing org
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditProduct(p)}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 font-mono">No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {filteredProducts.map((p) => (
          <div key={p.id} className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex-shrink-0 overflow-hidden relative">
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl opacity-30">📷</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{p.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex-shrink-0 ${
                    p.type === 'service' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                  }`}>
                    {p.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-mono">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">${(p.price / 100).toFixed(2)}</span>
                  <span>·</span>
                  <span>👀 {p.views}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                onClick={() => openEditProduct(p)}
                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer text-center active:scale-[0.97]"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDeleteProduct(p.id)}
                className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer text-center active:scale-[0.97]"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-xs font-mono border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            No items found.
          </div>
        )}
      </div>
      
      {/* Edit Product Modal */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40 overflow-y-auto pt-10 sm:pt-0" onClick={() => setIsProductModalOpen(false)}>
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl safe-area-bottom mt-auto sm:mt-0 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-900 flex-shrink-0">
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                ✏️ Edit Listing
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-normal">
                  ID: {editingProduct.id.slice(0, 8)}...
                </span>
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
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

              {/* Media Uploader */}
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

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
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
      )}
    </div>
  );
}
