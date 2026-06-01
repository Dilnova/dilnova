'use client';

import { useState, useTransition } from 'react';
import { deleteProductAction } from './actions';
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
}

export default function ManageProductsClient({
  initialProducts,
}: ManageProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'product' | 'service'>('all');
  const [search, setSearch] = useState('');

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

  const filteredProducts = products.filter((p) => {
    const matchesFilter = filter === 'all' || p.type === filter;
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog items..."
            className="w-full px-3.5 py-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          {(['all', 'product', 'service'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filter === f
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {f === 'all' ? 'All' : f === 'product' ? '🛒 Products' : '🛠️ Services'}
            </button>
          ))}
        </div>

        {/* Add New Button */}
        <Link
          href="/vendor/products/add"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add New Item
        </Link>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-3.5 rounded-lg text-xs font-mono border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Catalog Grid */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            Catalog Directory
            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full font-mono font-medium">
              {filteredProducts.length} Items
            </span>
          </h2>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-200 rounded-xl dark:border-zinc-800">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
              {products.length === 0
                ? 'Your catalog is empty'
                : 'No items match your search'}
            </p>
            <p className="text-zinc-400 text-xs mt-1.5 max-w-xs mx-auto">
              {products.length === 0
                ? 'Start by adding your first product or service to your vendor catalog.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {products.length === 0 && (
              <Link
                href="/vendor/products/add"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Add Your First Item →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col justify-between border border-zinc-200 rounded-xl p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div>
                  {/* Image Preview */}
                  <div className="relative w-full h-36 bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden mb-3 border border-zinc-200/55 dark:border-zinc-800">
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
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 font-mono">
                        No Image Provided
                      </div>
                    )}
                    
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full font-mono shadow-sm ${
                        item.type === 'service' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-350' 
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-350'
                      }`}>
                        {item.type}
                      </span>
                    </div>

                    {/* Media count badge */}
                    {item.media && item.media.length > 1 && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                          {item.media.length} media
                        </span>
                      </div>
                    )}
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
                    disabled={isPending}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
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
  );
}
