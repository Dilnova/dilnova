'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/notifications';
import { deleteProductAction } from '@/features/catalog/superadmin.actions';
import { TabDataTableLayout, type ColumnDef } from '@/shared/ui/TabDataTableLayout';
import { ProductsFilters } from './products/ProductsFilters';
import { ProductEditModal } from './products/ProductEditModal';

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
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
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
      deleteProductAction({ id: prodId }).then((res) => {
        if (!res?.data?.success) throw new Error(res?.serverError || 'Failed to delete product.');
        return res.data;
      }),
      {
        loading: 'Deleting product...',
        success: 'Product deleted.',
        error: (err) => err instanceof Error ? err.message : 'Failed to delete product.'
      }
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

  const filtersContent = (
    <ProductsFilters
      productSearch={productSearch}
      setProductSearch={setProductSearch}
      productTypeFilter={productTypeFilter}
      setProductTypeFilter={setProductTypeFilter}
      productCategoryFilter={productCategoryFilter}
      setProductCategoryFilter={setProductCategoryFilter}
      categories={categories}
    />
  );

  const columns: ColumnDef<Product>[] = [
    {
      header: 'Item Details',
      cell: (p) => (
        <>
          <div className="font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{p.name}</div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate max-w-[220px]">
            Cat: {p.categoryName || 'Uncategorized'}
          </div>
        </>
      ),
    },
    {
      header: 'Type',
      cell: (p) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
          p.type === 'service' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
        }`}>
          {p.type}
        </span>
      ),
    },
    {
      header: 'Price',
      cell: (p) => <span className="font-mono font-bold">${(p.price / 100).toFixed(2)}</span>,
    },
    {
      header: 'Views',
      cell: (p) => <span className="font-mono text-zinc-600 dark:text-zinc-400">👀 {p.views}</span>,
    },
    {
      header: 'Vendor Org',
      cell: (p) => (
        <>
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
        </>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (p) => (
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
      ),
    },
  ];

  const renderMobileCard = (p: Product) => (
    <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3.5 shadow-sm">
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
  );

  const modals = editingProduct && (
    <ProductEditModal
      product={editingProduct}
      isOpen={isProductModalOpen}
      onClose={() => setIsProductModalOpen(false)}
      categories={categories}
      maxMediaLimit={maxMediaLimit}
    />
  );

  return (
    <TabDataTableLayout
      isPending={isPending}
      title="Global Product Moderator"
      subtitle="Moderate or edit all catalog entries across vendors"
      filters={
        <>
          {filtersContent}
          {/* Results count */}
          <p className="text-[10px] text-zinc-400 font-mono px-1">
            {filteredProducts.length} of {products.length} items
          </p>
        </>
      }
      data={filteredProducts}
      columns={columns}
      renderMobileCard={renderMobileCard}
      emptyStateMessage="No items found."
      modals={modals}
    />
  );
}
