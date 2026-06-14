'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProductAction } from '@/features/catalog/vendor.actions';
import Image from 'next/image';
import Link from 'next/link';
import { isVideoUrl } from '@/utils/media';

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

interface ManageProductsClientProps {
  initialProducts: Product[];
  orgSlug?: string | null;
}

export default function ManageProductsClient({
  initialProducts,
  orgSlug,
}: ManageProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'product' | 'service'>('all');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Keep local list in sync when server data refreshes (e.g. after add on another page)
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleDeleteItem = (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    setDeletingId(id);
    startTransition(async () => {
      try {
        const result = await deleteProductAction(id);
        if (result.success) {
          setMessage({ type: 'success', text: `Deleted "${itemName}".` });
          setProducts((prev) => prev.filter((p) => p.id !== id));
          router.refresh();
        }
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete item.' });
      } finally {
        setDeletingId(null);
      }
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchesFilter = filter === 'all' || p.type === filter;
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const productCount = products.filter(p => p.type === 'product').length;
  const serviceCount = products.filter(p => p.type === 'service').length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Floating Toast */}
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
            <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100 p-1 cursor-pointer" aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 font-mono">{products.length}</p>
          <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">Total Items</p>
        </div>
        <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{productCount}</p>
          <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">Products</p>
        </div>
        <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{serviceCount}</p>
          <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">Services</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 shadow-sm">
        {/* Search */}
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter + Add */}
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl flex-1 sm:flex-none">
            {(['all', 'product', 'service'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filter === f
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {f === 'all' ? 'All' : f === 'product' ? '🛒 Products' : '🛠️ Services'}
              </button>
            ))}
          </div>

          {/* Add Button */}
          <Link
            href="/vendor/products/add"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/10 transition-all whitespace-nowrap cursor-pointer active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add New</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Results count */}
      {(search || filter !== 'all') && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono px-1">
          Showing {filteredProducts.length} of {products.length} items
          {search && <> matching &quot;{search}&quot;</>}
        </p>
      )}

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 sm:py-20 border-2 border-dashed border-zinc-200 rounded-2xl dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
          <div className="text-5xl mb-4 emoji">{products.length === 0 ? '📦' : '🔍'}</div>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm font-semibold">
            {products.length === 0 ? 'Your catalog is empty' : 'No items match your search'}
          </p>
          <p className="text-zinc-400 text-xs mt-1.5 max-w-xs mx-auto">
            {products.length === 0
              ? 'Start by adding your first product or service.'
              : 'Try adjusting your search or filter.'}
          </p>
          {products.length === 0 && (
            <Link
              href="/vendor/products/add"
              className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-[0.97]"
            >
              Add Your First Item →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((item, index) => (
            <div
              key={item.id}
              className={`group flex flex-row sm:flex-col bg-white border border-zinc-200 rounded-xl sm:rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 ${
                deletingId === item.id ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {/* Image — square on mobile row layout, rectangle on desktop card */}
              <div className="relative w-28 h-28 sm:w-full sm:h-40 flex-shrink-0 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                {item.imageUrl ? (
                  isVideoUrl(item.imageUrl) ? (
                    <video
                      src={item.imageUrl}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 112px, 280px"
                      priority={index < 4}
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl emoji opacity-70">📷</span>
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-2 left-2">
                  <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full font-mono shadow-sm ${
                    item.type === 'service' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-350' 
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-350'
                  }`}>
                    {item.type}
                  </span>
                </div>

                {/* Media count */}
                {item.media && item.media.length > 1 && (
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                      {item.media.length} 📎
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 min-w-0">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{item.name}</h3>
                  <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 sm:mt-1 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-zinc-100 dark:border-zinc-800/80 gap-2">
                  <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    ${(item.price / 100).toFixed(2)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/products/${item.id}`}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 rounded-lg text-[11px] font-semibold transition-all"
                    >
                      View
                    </Link>
                    {orgSlug && (
                      <Link
                        href={`/vendors/${orgSlug}`}
                        className="hidden sm:inline-flex px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 dark:text-purple-300 rounded-lg text-[11px] font-semibold transition-all"
                      >
                        Store
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      disabled={isPending}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
