'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  updateProductAction,
  deleteProductAction,
} from './actions';
import { updateSystemSettingAction } from './settingsActions';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
}

interface Product {
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

interface SuperAdminClientProps {
  categories: Category[];
  products: Product[];
  stats: {
    totalProducts: number;
    totalServices: number;
    totalCategories: number;
    totalViews: number;
  };
  maxMediaLimit: number;
  systemLogo: string;
  systemFavicon: string;
}

export default function SuperAdminClient({
  categories,
  products,
  stats,
  maxMediaLimit,
  systemLogo,
  systemFavicon,
}: SuperAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'products' | 'settings'>('overview');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settings State
  const [mediaLimitInput, setMediaLimitInput] = useState(maxMediaLimit);
  const [logoInput, setLogoInput] = useState(systemLogo);
  const [faviconInput, setFaviconInput] = useState(systemFavicon);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isFaviconUploading, setIsFaviconUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const [faviconUploadProgress, setFaviconUploadProgress] = useState<number | null>(null);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);

  // Category Form State
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Product Filter State
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');

  // Product Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdPrice, setEditProdPrice] = useState(0); // in dollars
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdType, setEditProdType] = useState<'product' | 'service'>('product');
  const [editProdMedia, setEditProdMedia] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Top 5 viewed products
  const topViewedProducts = [...products]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Helper: auto-generate slug from name
  const handleCategoryNameChange = (name: string) => {
    setCategoryName(name);
    setCategorySlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );
  };

  // Helper: render hierarchical category options
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

  // Helper: show transient message
  const triggerNotification = (success: boolean, text: string) => {
    if (success) {
      setSuccessMsg(text);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(text);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // ── CATEGORY EVENT HANDLERS ─────────────────────────────────

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategorySlug('');
    setCategoryParentId('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategorySlug(cat.slug);
    setCategoryParentId(cat.parentId || '');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        if (editingCategory) {
          await updateCategoryAction(editingCategory.id, categoryName, categorySlug, categoryParentId || null);
          triggerNotification(true, 'Category updated successfully.');
        } else {
          await createCategoryAction(categoryName, categorySlug, categoryParentId || null);
          triggerNotification(true, 'Category created successfully.');
        }
        setIsCategoryModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save category.';
        triggerNotification(false, msg);
      }
    });
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category? This operation will fail if products are linked.')) {
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      try {
        await deleteCategoryAction(catId);
        triggerNotification(true, 'Category deleted successfully.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete category.';
        triggerNotification(false, msg);
      }
    });
  };

  // ── PRODUCT MODERATOR EVENT HANDLERS ────────────────────────

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditProdName(prod.name);
    setEditProdPrice(prod.price / 100); // display as dollars
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
      const result = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress.percent);
      });

      if (result.success && result.publicUrl) {
        const newItem = { url: result.publicUrl, type: fileType };
        setEditProdMedia((prev) => [...prev, newItem]);
        triggerNotification(true, `${fileType === 'video' ? 'Video' : 'Image'} uploaded successfully!`);
      } else {
        triggerNotification(false, result.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
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
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const primaryThumbnail = editProdMedia[0]?.url || '';
        await updateProductAction(editingProduct.id, {
          name: editProdName,
          price: Math.round(editProdPrice * 100), // convert back to cents
          categoryId: editProdCategory || null,
          description: editProdDesc,
          type: editProdType,
          imageUrl: primaryThumbnail,
          media: editProdMedia,
        });
        triggerNotification(true, 'Product details and media updated successfully.');
        setIsProductModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save product.';
        triggerNotification(false, msg);
      }
    });
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm('Are you sure you want to permanently delete this product/service? This action is irreversible.')) {
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      try {
        await deleteProductAction(prodId);
        triggerNotification(true, 'Product listing moderated and deleted.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete product.';
        triggerNotification(false, msg);
      }
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerNotification(false, 'Logo file size exceeds 5MB limit.');
      return;
    }

    setIsLogoUploading(true);
    setLogoUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, (progress) => {
        setLogoUploadProgress(progress.percent);
      });

      if (result.success && result.publicUrl) {
        setLogoInput(result.publicUrl);
        triggerNotification(true, 'Logo uploaded successfully!');
      } else {
        triggerNotification(false, result.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      triggerNotification(false, 'An error occurred during logo upload.');
    } finally {
      setIsLogoUploading(false);
      setLogoUploadProgress(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerNotification(false, 'Favicon file size exceeds 2MB limit.');
      return;
    }

    setIsFaviconUploading(true);
    setFaviconUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, (progress) => {
        setFaviconUploadProgress(progress.percent);
      });

      if (result.success && result.publicUrl) {
        setFaviconInput(result.publicUrl);
        triggerNotification(true, 'Favicon uploaded successfully!');
      } else {
        triggerNotification(false, result.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      triggerNotification(false, 'An error occurred during favicon upload.');
    } finally {
      setIsFaviconUploading(false);
      setFaviconUploadProgress(null);
      if (faviconFileInputRef.current) faviconFileInputRef.current.value = '';
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mediaLimitInput < 1 || mediaLimitInput > 20) {
      triggerNotification(false, 'Media limit must be between 1 and 20.');
      return;
    }

    startTransition(async () => {
      try {
        await updateSystemSettingAction('max_media_limit', mediaLimitInput.toString());
        await updateSystemSettingAction('system_logo', logoInput);
        await updateSystemSettingAction('system_favicon', faviconInput);
        triggerNotification(true, 'System settings updated successfully.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update system settings.';
        triggerNotification(false, msg);
      }
    });
  };

  // Filter listings
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

  return (
    <div className="space-y-8">
      {/* ── HEADER TITLE ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-red-100 dark:bg-red-950/45 text-red-800 dark:text-red-400 tracking-wider">
            DB SUPERADMIN CONTROL
          </span>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-2">
            System Database Console
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Global catalog moderator, category manager, and system-wide content statistics.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 self-start">
          {(['overview', 'categories', 'products', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setErrorMsg(null);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                activeTab === tab
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300 text-xs font-semibold animate-fade-in flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 dark:bg-red-950/20 dark:border-red-900 dark:text-red-300 text-xs font-semibold animate-fade-in flex items-center gap-2">
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* Pending transition loader overlay */}
      {isPending && (
        <div className="fixed inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-4 py-2.5 rounded-lg shadow-xl text-xs font-mono font-bold tracking-wider flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            SAVING CHANGES...
          </div>
        </div>
      )}

      {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Products', val: stats.totalProducts, icon: '📦', color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400' },
              { label: 'Total Services', val: stats.totalServices, icon: '🧑‍🌾', color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400' },
              { label: 'Total Categories', val: stats.totalCategories, icon: '🏷️', color: 'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400' },
              { label: 'Total Page Views', val: stats.totalViews, icon: '👁️', color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400' },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white border border-zinc-200/80 rounded-2xl p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex items-center justify-between"
              >
                <div>
                  <span className="text-xs text-zinc-400 font-mono block">{card.label}</span>
                  <span className="text-2xl font-black mt-1.5 block text-zinc-850 dark:text-white">
                    {card.val.toLocaleString()}
                  </span>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl`}>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Top viewed items */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <span>🔥</span> Most Viewed Listings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Listing Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Views Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {topViewedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-200">{p.name}</td>
                      <td className="py-3 px-3 capitalize">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          p.type === 'service' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold">${(p.price / 100).toFixed(2)}</td>
                      <td className="py-3 px-3 text-zinc-500">{p.categoryName || 'Uncategorized'}</td>
                      <td className="py-3 px-3 font-mono font-black text-zinc-850 dark:text-white">
                        👀 {p.views}
                      </td>
                    </tr>
                  ))}
                  {topViewedProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400 font-mono">No listings found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">Category Directory</h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Control categories available for listings</p>
            </div>
            <button
              onClick={openAddCategory}
              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-purple-900/10 cursor-pointer"
            >
              + Create Category
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Category ID</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="py-3.5 px-4 text-zinc-900 dark:text-zinc-100">
                      <div className="font-bold flex items-center gap-2">
                        <span>{cat.name}</span>
                        {cat.parentId ? (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono text-[9px] uppercase tracking-wider dark:bg-zinc-850 dark:text-zinc-400">
                            Sub of {categories.find((c) => c.id === cat.parentId)?.name || 'Unknown'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-mono text-[9px] uppercase tracking-wider dark:bg-purple-950/20 dark:text-purple-400">
                            Main
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-500">{cat.slug}</td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-400">{cat.id}</td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono">{new Date(cat.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-450 font-mono">No categories configured in system database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ──────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">Global Product Moderator</h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Moderate or edit product and service catalog entries</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search name, description, ID..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-500 w-52"
              />
              <select
                value={productTypeFilter}
                onChange={(e) => setProductTypeFilter(e.target.value as 'all' | 'product' | 'service')}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent focus:outline-none dark:bg-zinc-950"
              >
                <option value="all">All Types</option>
                <option value="product">Products only</option>
                <option value="service">Services only</option>
              </select>
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent focus:outline-none dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
              >
                {renderCategoryOptions(true)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4">Vendor Org ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="py-4 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{p.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate max-w-[220px]">
                        ID: {p.id} | Cat: {p.categoryName || 'Uncategorized'}
                      </div>
                    </td>
                    <td className="py-4 px-4 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        p.type === 'service' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold">${(p.price / 100).toFixed(2)}</td>
                    <td className="py-4 px-4 font-mono text-zinc-600 dark:text-zinc-400">👀 {p.views}</td>
                    <td className="py-4 px-4 font-mono text-[10px] text-zinc-450 truncate max-w-[140px]">{p.orgId}</td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditProduct(p)}
                        className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Moderate
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-450 font-mono">No products or services found in system database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm max-w-xl space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">System Configurations</h2>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Configure system thresholds and global limits</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Max Media Upload Limit (Images/Videos)</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={mediaLimitInput}
                onChange={(e) => setMediaLimitInput(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Configure the maximum number of images and videos that vendors can attach to each product or service listing. (Min: 1, Max: 20).
              </p>
            </div>

            {/* Logo configuration */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-zinc-450 block">System Logo</label>
              {logoInput ? (
                <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="relative w-12 h-12 rounded overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-150 dark:bg-zinc-900">
                    <Image src={logoInput} alt="System Logo Preview" fill className="object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogoInput('')}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    Remove Logo
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/30 dark:bg-zinc-900/5 flex flex-col items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={isLogoUploading}
                    className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {isLogoUploading ? 'Uploading Logo...' : 'Click to Upload Logo'}
                  </button>
                  <p className="text-[9px] text-zinc-400 font-mono">PNG, JPG, WEBP (Max 5MB)</p>
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              )}
              {isLogoUploading && logoUploadProgress !== null && (
                <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-650 rounded-full transition-all"
                    style={{ width: `${logoUploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Favicon configuration */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-zinc-450 block">Favicon Icon</label>
              {faviconInput ? (
                <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="relative w-8 h-8 rounded overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-150 dark:bg-zinc-900">
                    <Image src={faviconInput} alt="Favicon Preview" fill className="object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFaviconInput('')}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    Remove Favicon
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/30 dark:bg-zinc-900/5 flex flex-col items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => faviconFileInputRef.current?.click()}
                    disabled={isFaviconUploading}
                    className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {isFaviconUploading ? 'Uploading Favicon...' : 'Click to Upload Favicon'}
                  </button>
                  <p className="text-[9px] text-zinc-400 font-mono">ICO, PNG (Max 2MB)</p>
                  <input
                    type="file"
                    ref={faviconFileInputRef}
                    onChange={handleFaviconUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              )}
              {isFaviconUploading && faviconUploadProgress !== null && (
                <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-650 rounded-full transition-all"
                    style={{ width: `${faviconUploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || isLogoUploading || isFaviconUploading}
              className="py-2 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-purple-900/10 disabled:opacity-50"
            >
              {isPending ? 'Saving Configurations...' : 'Save Configurations'}
            </button>
          </form>
        </div>
      )}

      {/* ── CATEGORY DIALOG MODAL ──────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scale-up">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">
              {editingCategory ? 'Edit Product Category' : 'Create Product Category'}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-6">Database configuration</p>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  placeholder="e.g. Garden Seeds"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Slug URL</label>
                <input
                  type="text"
                  required
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value.toLowerCase().replace(/ /g, '-'))}
                  placeholder="e.g. garden-seeds"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Parent Category</label>
                <select
                  value={categoryParentId}
                  onChange={(e) => setCategoryParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent focus:outline-none dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="">None (Make Main Category)</option>
                  {categories
                    .filter((c) => !c.parentId && c.id !== editingCategory?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-250 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-purple-900/10"
                >
                  {editingCategory ? 'Update Details' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRODUCT EDIT MODAL ─────────────────────────────────── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">
              Moderate Catalog Item
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-6">Database Moderator Override</p>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Item Type</label>
                  <select
                    value={editProdType}
                    onChange={(e) => setEditProdType(e.target.value as 'product' | 'service')}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent focus:outline-none dark:bg-zinc-950"
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Category</label>
                  <select
                    value={editProdCategory}
                    onChange={(e) => setEditProdCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent focus:outline-none dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                  >
                    {renderCategoryOptions(false)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Price (in USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editProdPrice}
                  onChange={(e) => setEditProdPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editProdDesc}
                  onChange={(e) => setEditProdDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none leading-relaxed"
                />
              </div>

              {/* Media Gallery */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-zinc-450 block mb-1">
                  Media Gallery ({editProdMedia.length}/{maxMediaLimit})
                </label>

                {/* Uploaded Grid */}
                {editProdMedia.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 border border-zinc-200 dark:border-zinc-850 rounded-xl p-2 bg-zinc-50/50 dark:bg-zinc-900/10">
                    {editProdMedia.map((item, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                      >
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-350 p-1 text-center">
                            <span className="text-sm">🎬</span>
                            <span className="text-[7px] font-mono mt-0.5 truncate max-w-full">Video</span>
                          </div>
                        ) : (
                          <Image
                            src={item.url}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveProductMedia(index)}
                          className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-700 text-white rounded p-0.5 text-[8px] leading-none cursor-pointer transition-all shadow"
                          title="Remove media"
                        >
                          ✕
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-0.5 left-0.5 bg-purple-700/95 text-white text-[6px] px-1 py-0.5 rounded font-bold uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Drop Zone / Button */}
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/30 dark:bg-zinc-900/5 flex flex-col items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || editProdMedia.length >= maxMediaLimit}
                    className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {isUploading 
                      ? 'Uploading to Cloudinary...' 
                      : editProdMedia.length >= maxMediaLimit
                        ? `Media Limit Reached (${maxMediaLimit})`
                        : `Click to Add Media (${editProdMedia.length}/${maxMediaLimit})`}
                  </button>
                  <p className="text-[9px] text-zinc-400 font-mono">PNG, JPG, WEBP, or MP4 (Max 10MB)</p>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProductFileUpload}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                </div>

                {/* Upload Progress Bar */}
                {isUploading && uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-650 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-250 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-purple-900/10"
                >
                  Save Mod Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
