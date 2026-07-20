'use client';

import React, { useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { usePOSContext } from '../POSBillingProvider';

export default function POSProductGrid() {
  const {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    paginatedProducts,
    filteredProducts,
    currentPage,
    setCurrentPage,
    totalPages,
    cart,
    addToCart,
    getProductStockInfo,
    isProductPurchasable,
    data,
  } = usePOSContext();
  
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Global POS Keyboard Shortcuts for Search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === 'F2') && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setSearchQuery]);

  const filteredProductsLength = filteredProducts.length;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();

      const exactMatch = data.inventoryItems.find(
        (i) =>
          isProductPurchasable(i) &&
          ((i.sku && i.sku.toLowerCase() === q) || i.productId.toLowerCase() === q)
      );

      if (exactMatch) {
        addToCart(exactMatch, true);
        toast.success(`Scanned: ${exactMatch.productName}`);
        setSearchQuery('');
        return;
      }

      if (filteredProductsLength === 1) {
        addToCart(paginatedProducts[0], true);
        toast.success(`Added: ${paginatedProducts[0].productName}`);
        setSearchQuery('');
        return;
      }

      if (filteredProductsLength === 0) {
        toast.error(`Barcode/SKU "${searchQuery}" not found.`);
      }
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 sm:p-4 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search product name or scan SKU (Enter)... ['/' to focus]"
          className="w-full pl-9 pr-16 py-2 border border-zinc-200 rounded-xl text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: 'all', label: 'All' },
          { id: 'products', label: 'Products' },
          { id: 'services', label: 'Services' },
          { id: 'low_stock', label: 'Low Stock' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id as 'all' | 'products' | 'services' | 'low_stock')}
            className={`px-3 py-1 rounded-lg font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === tab.id
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-zinc-400 font-mono">
          {filteredProductsLength} items
        </span>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 min-h-[340px] max-h-[520px] overflow-y-auto pr-1">
        {paginatedProducts.map((item) => {
          const info = getProductStockInfo(item.productId);
          const inCartItem = cart.find((i) => i.product.productId === item.productId);

          return (
            <button
              key={item.productId}
              onClick={() => addToCart(item)}
              disabled={info.qty <= 0}
              className={`p-2.5 border rounded-xl text-left transition-all active:scale-[0.97] hover:border-zinc-400 group flex flex-col justify-between h-24 relative ${
                info.qty <= 0
                  ? 'opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-950'
                  : inCartItem
                  ? 'bg-indigo-50/50 border-indigo-300 dark:bg-indigo-950/20 dark:border-indigo-800'
                  : 'bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 cursor-pointer'
              }`}
            >
              {inCartItem && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {inCartItem.quantity}
                </span>
              )}

              <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate w-full">
                {item.productName}
              </span>

              <div>
                <span className="text-[10px] text-zinc-400 block font-mono truncate">
                  {item.sku ? item.sku : 'No SKU'}
                </span>

                <div className="flex justify-between items-center mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-black font-mono text-zinc-900 dark:text-white">
                    ${((item.productPrice ?? 0) / 100).toFixed(2)}
                  </span>

                  {item.productType === 'service' ? (
                    <span className="text-[9px] font-bold text-indigo-500 uppercase">Service</span>
                  ) : (
                    <span
                      className={`text-[9px] font-semibold ${
                        info.qty <= 5 ? 'text-rose-500 font-extrabold' : 'text-zinc-400'
                      }`}
                    >
                      {info.qty <= 0 ? 'Out' : `${info.qty} left`}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filteredProductsLength === 0 && (
          <div className="col-span-full py-14 text-center text-zinc-400 font-mono text-xs space-y-1">
            <p>No products found.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 font-bold disabled:opacity-40 cursor-pointer"
          >
            ← Prev
          </button>

          <span className="font-mono text-[11px] text-zinc-500">
            {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 font-bold disabled:opacity-40 cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
