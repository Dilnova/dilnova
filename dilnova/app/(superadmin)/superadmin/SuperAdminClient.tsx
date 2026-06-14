'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  updateProductAction,
  deleteProductAction,
  createPricingPlanAction,
  updatePricingPlanAction,
  deletePricingPlanAction,
  updateContactStatusAction,
} from './actions';
import { updateSystemSettingAction } from './settingsActions';
import CheckoutOptionsSettings from './CheckoutOptionsSettings';
import StockAvailabilitySettings from './StockAvailabilitySettings';
import InventoryTab from './InventoryTab';
import VendorOrgIssuesTab from './VendorOrgIssuesTab';
import type { CheckoutOptionDefinition } from '@/utils/checkoutOptionsShared';
import type { StockAvailabilityDefinition } from '@/utils/stockAvailabilityShared';
import type { VendorOrgIntegrityReport } from '@/utils/vendorOrgIntegrity';
import type { InventoryItem, Supplier as IMSSupplier, InventoryMovement, SimulatedOrder, ProductForInventory } from './InventoryTab';

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

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string | null;
  features: string[];
  isPopular: boolean;
  buttonText: string;
  buttonLink: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
  systemName: string;
  pricingPlans: PricingPlan[];
  contactSubmissions: ContactSubmission[];
  hardwareCustomEnabled: boolean;
  nurseryCustomEnabled: boolean;
  techCustomEnabled: boolean;
  servicesCustomEnabled: boolean;
  checkoutOptionsCatalog: CheckoutOptionDefinition[];
  stockAvailabilityCatalog: StockAvailabilityDefinition[];
  // IMS props
  inventoryItems: InventoryItem[];
  imsSuppliers: IMSSupplier[];
  inventoryMovements: InventoryMovement[];
  simulatedOrders: SimulatedOrder[];
  productsWithoutInventory: ProductForInventory[];
  organizations: {
    id: string;
    name: string;
    slug: string | null;
    imageUrl: string;
    publicMetadata: Record<string, any>;
  }[];
  vendorOrgIntegrity: VendorOrgIntegrityReport;
}

export default function SuperAdminClient({
  categories,
  products,
  stats,
  maxMediaLimit,
  systemLogo,
  systemFavicon,
  systemName,
  pricingPlans,
  contactSubmissions,
  hardwareCustomEnabled,
  nurseryCustomEnabled,
  techCustomEnabled,
  servicesCustomEnabled,
  checkoutOptionsCatalog,
  stockAvailabilityCatalog,
  inventoryItems,
  imsSuppliers,
  inventoryMovements,
  simulatedOrders,
  productsWithoutInventory,
  organizations,
  vendorOrgIntegrity,
}: SuperAdminClientProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'categories' | 'products' | 'inventory' | 'vendor-issues' | 'pricing' | 'contacts' | 'settings'
  >('overview');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settings State
  const [mediaLimitInput, setMediaLimitInput] = useState(maxMediaLimit);
  const [logoInput, setLogoInput] = useState(systemLogo);
  const [faviconInput, setFaviconInput] = useState(systemFavicon);
  const [systemNameInput, setSystemNameInput] = useState(systemName);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isFaviconUploading, setIsFaviconUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const [faviconUploadProgress, setFaviconUploadProgress] = useState<number | null>(null);
  const [hardwareCustomEnabledInput, setHardwareCustomEnabledInput] = useState(hardwareCustomEnabled);
  const [nurseryCustomEnabledInput, setNurseryCustomEnabledInput] = useState(nurseryCustomEnabled);
  const [techCustomEnabledInput, setTechCustomEnabledInput] = useState(techCustomEnabled);
  const [servicesCustomEnabledInput, setServicesCustomEnabledInput] = useState(servicesCustomEnabled);

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
  const [editProdPrice, setEditProdPrice] = useState(0);
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdType, setEditProdType] = useState<'product' | 'service'>('product');
  const [editProdMedia, setEditProdMedia] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Pricing Form State
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planPeriod, setPlanPeriod] = useState('/month');
  const [planDesc, setPlanDesc] = useState('');
  const [planFeatures, setPlanFeatures] = useState('');
  const [planIsPopular, setPlanIsPopular] = useState(false);
  const [planButtonText, setPlanButtonText] = useState('Get Started');
  const [planButtonLink, setPlanButtonLink] = useState('/contact');
  const [editingPricingPlan, setEditingPricingPlan] = useState<PricingPlan | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // Contact Requests State
  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState<'all' | 'pending' | 'connected' | 'no_longer'>('all');
  const [contactCategoryFilter, setContactCategoryFilter] = useState<'all' | 'collaboration' | 'registration' | 'info'>('all');

  // Auto-dismiss toasts
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

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
    } else {
      setErrorMsg(text);
      setSuccessMsg(null);
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
      const result = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress.percent);
      });

      if (result.success && result.publicUrl) {
        const newItem = { url: result.publicUrl, type: fileType };
        setEditProdMedia((prev) => [...prev, newItem]);
        triggerNotification(true, `${fileType === 'video' ? 'Video' : 'Image'} uploaded!`);
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
    if (!confirm('Are you sure you want to permanently delete this product/service? This action is irreversible.')) {
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      try {
        await deleteProductAction(prodId);
        triggerNotification(true, 'Product deleted.');
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
        triggerNotification(true, 'Logo uploaded!');
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
        triggerNotification(true, 'Favicon uploaded!');
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
        await updateSystemSettingAction('system_name', systemNameInput.trim());
        await updateSystemSettingAction('max_media_limit', mediaLimitInput.toString());
        await updateSystemSettingAction('system_logo', logoInput);
        await updateSystemSettingAction('system_favicon', faviconInput);
        await updateSystemSettingAction('custom_storefront_distar-hardware', hardwareCustomEnabledInput ? 'true' : 'false');
        await updateSystemSettingAction('custom_storefront_distar-nursery', nurseryCustomEnabledInput ? 'true' : 'false');
        await updateSystemSettingAction('custom_storefront_distar-tech', techCustomEnabledInput ? 'true' : 'false');
        await updateSystemSettingAction('custom_storefront_dilstar-services', servicesCustomEnabledInput ? 'true' : 'false');
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

  // ── PRICING EVENT HANDLERS ──────────────────────────────────
  const openAddPricingPlan = () => {
    setEditingPricingPlan(null);
    setPlanName('');
    setPlanPrice('');
    setPlanPeriod('/month');
    setPlanDesc('');
    setPlanFeatures('');
    setPlanIsPopular(false);
    setPlanButtonText('Get Started');
    setPlanButtonLink('/contact');
    setIsPricingModalOpen(true);
  };

  const openEditPricingPlan = (plan: PricingPlan) => {
    setEditingPricingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(plan.price);
    setPlanPeriod(plan.period);
    setPlanDesc(plan.description || '');
    setPlanFeatures((plan.features || []).join('\n'));
    setPlanIsPopular(plan.isPopular);
    setPlanButtonText(plan.buttonText);
    setPlanButtonLink(plan.buttonLink);
    setIsPricingModalOpen(true);
  };

  const handleSavePricingPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const featuresArray = planFeatures
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    startTransition(async () => {
      try {
        const payload = {
          name: planName,
          price: planPrice,
          period: planPeriod,
          description: planDesc || undefined,
          features: featuresArray,
          isPopular: planIsPopular,
          buttonText: planButtonText,
          buttonLink: planButtonLink,
        };

        if (editingPricingPlan) {
          await updatePricingPlanAction(editingPricingPlan.id, payload);
          triggerNotification(true, 'Pricing plan updated successfully.');
        } else {
          await createPricingPlanAction(payload);
          triggerNotification(true, 'Pricing plan created successfully.');
        }
        setIsPricingModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save pricing plan.';
        triggerNotification(false, msg);
      }
    });
  };

  const handleDeletePricingPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to permanently delete this pricing plan?')) {
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      try {
        await deletePricingPlanAction(planId);
        triggerNotification(true, 'Pricing plan deleted successfully.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete pricing plan.';
        triggerNotification(false, msg);
      }
    });
  };

  // ── CONTACT REQUEST HANDLERS ─────────────────────────────────
  const handleUpdateContactStatus = async (contactId: string, status: 'pending' | 'connected' | 'no_longer') => {
    setErrorMsg(null);

    startTransition(async () => {
      try {
        await updateContactStatusAction(contactId, status);
        triggerNotification(true, 'Contact request status updated successfully.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update contact status.';
        triggerNotification(false, msg);
      }
    });
  };

  const knownOrgIds = new Set(organizations.map((org) => org.id));
  const orgNameById = new Map(organizations.map((org) => [org.id, org.name]));

  const tabConfig = [
    { key: 'overview' as const, label: 'Overview', icon: '📊' },
    { key: 'categories' as const, label: 'Categories', icon: '🏷️' },
    { key: 'products' as const, label: 'Products', icon: '📦' },
    { key: 'inventory' as const, label: 'Inventory', icon: '🏭' },
    {
      key: 'vendor-issues' as const,
      label: 'Vendor Issues',
      icon: '🏢',
      badge: vendorOrgIntegrity.totals.orphanOrgIds,
    },
    { key: 'pricing' as const, label: 'Pricing Plans', icon: '💳' },
    { key: 'contacts' as const, label: 'Contact Requests', icon: '📨' },
    { key: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Floating Toast ── */}
      {(successMsg || errorMsg) && (
        <div
          className={`fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-[60] p-3.5 rounded-xl text-xs font-semibold border shadow-xl backdrop-blur-lg ${
            successMsg
              ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-400 dark:border-emerald-900/50'
              : 'bg-rose-50/95 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-400 dark:border-rose-900/50'
          }`}
          style={{ animation: 'mobileMenuSlideDown 0.25s ease-out' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{successMsg ? `✓ ${successMsg}` : `⚠️ ${errorMsg}`}</span>
            <button
              onClick={() => { setSuccessMsg(null); setErrorMsg(null); }}
              className="opacity-60 hover:opacity-100 p-1 cursor-pointer"
              aria-label="Dismiss"
            >✕</button>
          </div>
        </div>
      )}

      {/* ── Saving Overlay ── */}
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

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-extrabold bg-red-100 dark:bg-red-950/45 text-red-800 dark:text-red-400 tracking-wider">
              SUPERADMIN
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-1.5">
              System Console
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm mt-0.5 hidden sm:block">
              Global catalog moderator, category manager, and system settings.
            </p>
          </div>
        </div>

        {/* Tab Navigation — horizontal scroll on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
                activeTab === tab.key
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              {tab.label}
              {'badge' in tab && typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="ml-1 inline-flex min-w-[1.25rem] h-5 px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Products', val: stats.totalProducts, icon: '📦', accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
              { label: 'Services', val: stats.totalServices, icon: '🛠️', accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Categories', val: stats.totalCategories, icon: '🏷️', accent: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
              { label: 'Page Views', val: stats.totalViews, icon: '👁️', accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs text-zinc-400 font-medium">{card.label}</span>
                  <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${card.bg} flex items-center justify-center text-base sm:text-lg`}>
                    {card.icon}
                  </span>
                </div>
                <span className={`text-2xl sm:text-3xl font-black block ${card.accent}`}>
                  {card.val.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Top viewed items */}
          <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80">
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span>🔥</span> Most Viewed Listings
              </h2>
            </div>

            {/* Mobile: card list | Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Listing Name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Price</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {topViewedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-200">{p.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          p.type === 'service' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">${(p.price / 100).toFixed(2)}</td>
                      <td className="py-3 px-4 text-zinc-500">{p.categoryName || 'Uncategorized'}</td>
                      <td className="py-3 px-4 font-mono font-black text-zinc-850 dark:text-white">👀 {p.views}</td>
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

            {/* Mobile card layout */}
            <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {topViewedProducts.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-lg flex-shrink-0">
                    {p.type === 'service' ? '🛠️' : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">${(p.price / 100).toFixed(2)} · {p.categoryName || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 font-mono">{p.views}</p>
                    <p className="text-[9px] text-zinc-400">views</p>
                  </div>
                </div>
              ))}
              {topViewedProducts.length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-xs font-mono">No listings found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── CATEGORIES TAB ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Header + Add button */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Category Directory</h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5 hidden sm:block">Control categories available for listings</p>
            </div>
            <button
              onClick={openAddCategory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/10 cursor-pointer active:scale-[0.97] whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Create Category</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-zinc-200 rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider bg-zinc-50/50 dark:bg-zinc-900/30">
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3.5 px-4 text-zinc-900 dark:text-zinc-100">
                        <div className="font-bold flex items-center gap-2 flex-wrap">
                          <span>{cat.name}</span>
                          {cat.parentId ? (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono text-[9px] uppercase tracking-wider dark:bg-zinc-850 dark:text-zinc-400">
                              Sub of {categories.find((c) => c.id === cat.parentId)?.name || '?'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-mono text-[9px] uppercase tracking-wider dark:bg-purple-950/20 dark:text-purple-400">
                              Main
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-500">{cat.slug}</td>
                      <td className="py-3.5 px-4 text-zinc-500 font-mono">{new Date(cat.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-400 font-mono">No categories configured.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{cat.name}</span>
                      {cat.parentId ? (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono text-[9px] uppercase dark:bg-zinc-850 dark:text-zinc-400">
                          Sub
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-mono text-[9px] uppercase dark:bg-purple-950/20 dark:text-purple-400">
                          Main
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">/{cat.slug}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-xs font-mono border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No categories configured.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── PRODUCTS TAB ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="space-y-4">
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
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
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
                  {/* Thumbnail */}
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── INVENTORY TAB ──────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <InventoryTab
          inventoryItems={inventoryItems}
          suppliers={imsSuppliers}
          movements={inventoryMovements}
          simulatedOrders={simulatedOrders}
          productsWithoutInventory={productsWithoutInventory}
          checkoutOptionsCatalog={checkoutOptionsCatalog}
          triggerNotification={triggerNotification}
          organizations={organizations}
        />
      )}

      {activeTab === 'vendor-issues' && (
        <VendorOrgIssuesTab
          integrityReport={vendorOrgIntegrity}
          organizations={organizations}
          triggerNotification={triggerNotification}
        />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── PRICING PLANS TAB ─────────────────────────────────── */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Pricing Plans</h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Manage pricing options shown on the landing page</p>
            </div>
            <button
              onClick={openAddPricingPlan}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/10 cursor-pointer active:scale-[0.97] whitespace-nowrap"
            >
              Add Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricingPlans.map((plan) => (
              <div key={plan.id} className={`bg-white border rounded-2xl p-5 dark:bg-zinc-950 shadow-sm flex flex-col justify-between ${plan.isPopular ? 'border-purple-500' : 'border-zinc-200 dark:border-zinc-800'}`}>
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                    {plan.isPopular && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-[9px] uppercase tracking-wider font-extrabold">Popular</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{plan.description || 'No description provided.'}</p>
                  <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 font-mono mb-4">
                    {plan.price}
                    <span className="text-xs font-normal text-zinc-400">{plan.period}</span>
                  </div>
                  <div className="space-y-1.5 mb-6">
                    <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Features</p>
                    <ul className="text-xs space-y-1 text-zinc-650 dark:text-zinc-350">
                      {(plan.features || []).map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-4">
                  <button
                    onClick={() => openEditPricingPlan(plan)}
                    className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePricingPlan(plan.id)}
                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {pricingPlans.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-400 text-xs font-mono border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No custom pricing plans configured. Using default homepage fallbacks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTACT REQUESTS TAB ──────────────────────────────── */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Contact Submissions</h2>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Manage partner connections and user registration requests</p>
          </div>

          {/* Filters toolbar */}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search name, email, message..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={contactStatusFilter}
                onChange={(e) => setContactStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Connect requests (Pending)</option>
                <option value="connected">Already Connected</option>
                <option value="no_longer">No Longer Connected</option>
              </select>
              <select
                value={contactCategoryFilter}
                onChange={(e) => setContactCategoryFilter(e.target.value as any)}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="collaboration">Collaboration</option>
                <option value="registration">Registration</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {contactSubmissions
              .filter((c) => {
                const matchesSearch =
                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  c.subject.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  c.message.toLowerCase().includes(contactSearch.toLowerCase());
                const matchesStatus = contactStatusFilter === 'all' || c.status === contactStatusFilter;
                const matchesCategory = contactCategoryFilter === 'all' || c.category === contactCategoryFilter;
                return matchesSearch && matchesStatus && matchesCategory;
              })
              .map((c) => (
                <div key={c.id} className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-bold text-zinc-950 dark:text-zinc-550 text-sm flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="font-normal text-zinc-400 text-xs font-mono">&lt;{c.email}&gt;</span>
                      </h3>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                        Submitted on {new Date(c.createdAt).toLocaleString()} · Category:{' '}
                        <span className="text-purple-600 dark:text-purple-400 font-bold uppercase">{c.category}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">Status:</span>
                      <select
                        value={c.status}
                        onChange={(e) => handleUpdateContactStatus(c.id, e.target.value as any)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          c.status === 'connected'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50'
                            : c.status === 'no_longer'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/50'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/50'
                        }`}
                      >
                        <option value="pending">Connect Request (Pending)</option>
                        <option value="connected">Already Connected</option>
                        <option value="no_longer">No Longer Connected</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-900">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Subject: {c.subject}</p>
                    <p className="text-xs text-zinc-650 dark:text-zinc-350 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-900 leading-relaxed whitespace-pre-wrap">
                      {c.message}
                    </p>
                  </div>
                </div>
              ))}

            {contactSubmissions.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-xs font-mono border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No contact form submissions found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">System Settings</h2>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Configure system thresholds and branding</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Application Name */}
            <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>🏷️</span> Application Name
              </h3>
              <input
                type="text"
                required
                maxLength={100}
                value={systemNameInput}
                onChange={(e) => setSystemNameInput(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                placeholder="e.g. Dilnova Hub"
              />
              <p className="text-[10px] text-zinc-400">
                The global display name of the application, used in header titles, layouts, metadata, and automated emails.
              </p>
            </div>

            {/* Media Limit */}
            <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>📊</span> Media Upload Limit
              </h3>
              <input
                type="number"
                min="1"
                max="20"
                inputMode="numeric"
                required
                value={mediaLimitInput}
                onChange={(e) => setMediaLimitInput(parseInt(e.target.value, 10) || 1)}
                className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
              />
              <p className="text-[10px] text-zinc-400">
                Max images/videos per product listing (1–20).
              </p>
            </div>

            {/* Logo */}
            <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>🖼️</span> System Logo
              </h3>
              {logoInput ? (
                <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
                    <Image src={logoInput} alt="System Logo Preview" fill className="object-contain" sizes="64px" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogoInput('')}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={isLogoUploading}
                  className="w-full py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {isLogoUploading ? 'Uploading...' : 'Upload Logo'}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono">PNG, JPG, WEBP (Max 5MB)</span>
                </button>
              )}
              <input type="file" ref={logoFileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              {isLogoUploading && logoUploadProgress !== null && (
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${logoUploadProgress}%` }} />
                </div>
              )}
            </div>

            {/* Favicon */}
            <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>⭐</span> Favicon Icon
              </h3>
              {faviconInput ? (
                <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
                    <Image src={faviconInput} alt="Favicon Preview" fill className="object-contain" sizes="40px" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFaviconInput('')}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => faviconFileInputRef.current?.click()}
                  disabled={isFaviconUploading}
                  className="w-full py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="text-2xl">⭐</span>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {isFaviconUploading ? 'Uploading...' : 'Upload Favicon'}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono">ICO, PNG (Max 2MB)</span>
                </button>
              )}
              <input type="file" ref={faviconFileInputRef} onChange={handleFaviconUpload} accept="image/*" className="hidden" />
              {isFaviconUploading && faviconUploadProgress !== null && (
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${faviconUploadProgress}%` }} />
                </div>
              )}
            </div>

            {/* Custom Storefront Toggles */}
            <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                <span>🎨</span> Custom Storefront Layouts
              </h3>
              
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <label htmlFor="toggle-hardware" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Distar Hardware Storefront
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Toggle custom dashboard storefront layout for Distar Hardware
                  </p>
                </div>
                <button
                  id="toggle-hardware"
                  type="button"
                  onClick={() => setHardwareCustomEnabledInput(!hardwareCustomEnabledInput)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                    hardwareCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                  aria-pressed={hardwareCustomEnabledInput}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      hardwareCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
                <div className="space-y-0.5">
                  <label htmlFor="toggle-nursery" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Distar Nursery Storefront
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Toggle custom dashboard storefront layout for Distar Nursery
                  </p>
                </div>
                <button
                  id="toggle-nursery"
                  type="button"
                  onClick={() => setNurseryCustomEnabledInput(!nurseryCustomEnabledInput)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                    nurseryCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                  aria-pressed={nurseryCustomEnabledInput}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      nurseryCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
                <div className="space-y-0.5">
                  <label htmlFor="toggle-tech" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Distar Tech Storefront
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Toggle custom dashboard storefront layout for Distar Tech Store
                  </p>
                </div>
                <button
                  id="toggle-tech"
                  type="button"
                  onClick={() => setTechCustomEnabledInput(!techCustomEnabledInput)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                    techCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                  aria-pressed={techCustomEnabledInput}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      techCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
                <div className="space-y-0.5">
                  <label htmlFor="toggle-services" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Dilstar Services Storefront
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Toggle custom dashboard storefront layout for Dilstar Services
                  </p>
                </div>
                <button
                  id="toggle-services"
                  type="button"
                  onClick={() => setServicesCustomEnabledInput(!servicesCustomEnabledInput)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                    servicesCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                  aria-pressed={servicesCustomEnabledInput}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      servicesCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={isPending || isLogoUploading || isFaviconUploading}
              className="w-full py-3.5 sm:py-3 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/15 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : (
                'Save All Settings'
              )}
            </button>
          </form>

          <CheckoutOptionsSettings
            initialCatalog={checkoutOptionsCatalog}
            triggerNotification={triggerNotification}
          />

          <StockAvailabilitySettings
            initialCatalog={stockAvailabilityCatalog}
            triggerNotification={triggerNotification}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── CATEGORY DIALOG MODAL ──────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40" onClick={() => setIsCategoryModalOpen(false)}>
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'mobileMenuSlideDown 0.2s ease-out' }}
          >
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-5">Database configuration</p>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  placeholder="e.g. Garden Seeds"
                  className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Slug URL</label>
                <input
                  type="text"
                  required
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value.toLowerCase().replace(/ /g, '-'))}
                  placeholder="e.g. garden-seeds"
                  className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Parent Category</label>
                <select
                  value={categoryParentId}
                  onChange={(e) => setCategoryParentId(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none appearance-none transition-all"
                >
                  <option value="">None (Main Category)</option>
                  {categories
                    .filter((c) => !c.parentId && c.id !== editingCategory?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-3 sm:py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm sm:text-xs font-semibold rounded-xl transition-all cursor-pointer text-center active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 sm:py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm sm:text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/10 active:scale-[0.97]"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── PRODUCT EDIT MODAL ─────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40" onClick={() => setIsProductModalOpen(false)}>
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'mobileMenuSlideDown 0.2s ease-out' }}
          >
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">
              Edit Catalog Item
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-5">Moderator Override</p>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Type</label>
                  <select
                    value={editProdType}
                    onChange={(e) => setEditProdType(e.target.value as 'product' | 'service')}
                    className="w-full px-3 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none appearance-none"
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Category</label>
                  <select
                    value={editProdCategory}
                    onChange={(e) => setEditProdCategory(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none appearance-none"
                  >
                    {renderCategoryOptions(false)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    required
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editProdDesc}
                  onChange={(e) => setEditProdDesc(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-y min-h-[70px] transition-all"
                />
              </div>

              {/* Media Gallery */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                  <span>Media Gallery</span>
                  <span className="font-mono text-zinc-400">{editProdMedia.length}/{maxMediaLimit}</span>
                </label>

                {editProdMedia.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
                    {editProdMedia.map((item, index) => (
                      <div
                        key={index}
                        className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                      >
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-300">
                            <span className="text-lg">🎬</span>
                          </div>
                        ) : (
                          <Image src={item.url} alt="Preview" fill className="object-cover" sizes="80px" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveProductMedia(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow active:scale-90"
                        >
                          ✕
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 bg-purple-700/90 text-white text-[7px] px-1 py-0.5 rounded-full font-bold uppercase">Cover</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {editProdMedia.length < maxMediaLimit && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {isUploading ? 'Uploading...' : 'Add Media'}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono">PNG, JPG, WEBP, MP4 (Max 10MB)</span>
                  </button>
                )}

                <input type="file" ref={fileInputRef} onChange={handleProductFileUpload} accept="image/*,video/*" className="hidden" />

                {isUploading && uploadProgress !== null && (
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-3 sm:py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm sm:text-xs font-semibold rounded-xl transition-all cursor-pointer text-center active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="flex-1 py-3 sm:py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm sm:text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/10 active:scale-[0.97]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRICING PLAN DIALOG MODAL ───────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40" onClick={() => setIsPricingModalOpen(false)}>
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'mobileMenuSlideDown 0.2s ease-out' }}
          >
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">
              {editingPricingPlan ? 'Edit Pricing Plan' : 'Create Pricing Plan'}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-5">Database configuration</p>

            <form onSubmit={handleSavePricingPlan} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Starter"
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Price (e.g. $49 or Custom)</label>
                  <input
                    type="text"
                    required
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="e.g. $49"
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Period (optional)</label>
                  <input
                    type="text"
                    value={planPeriod}
                    onChange={(e) => setPlanPeriod(e.target.value)}
                    placeholder="e.g. /month"
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="Short marketing description..."
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Features (One per line)</label>
                <textarea
                  rows={4}
                  required
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  placeholder="1 Storefront Tenant&#10;Unlimited products&#10;Sales Analytics"
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="planIsPopular"
                  checked={planIsPopular}
                  onChange={(e) => setPlanIsPopular(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-zinc-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="planIsPopular" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none cursor-pointer">
                  Feature this plan (Most Popular badge)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    required
                    value={planButtonText}
                    onChange={(e) => setPlanButtonText(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">CTA Button Link</label>
                  <input
                    type="text"
                    required
                    value={planButtonLink}
                    onChange={(e) => setPlanButtonLink(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="flex-1 py-3 sm:py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm sm:text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 sm:py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm sm:text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/10"
                >
                  {editingPricingPlan ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
