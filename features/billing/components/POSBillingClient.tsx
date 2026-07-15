'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { VendorBillingRegisterData } from '@/features/billing/types';
import { toast } from 'sonner';
import { usePOSBilling } from '../hooks/usePOSBilling';
import POSProductGrid from './pos-parts/POSProductGrid';
import POSTicketPanel from './pos-parts/POSTicketPanel';
import POSReceiptModal from './pos-parts/POSReceiptModal';

interface Props {
  initialData: VendorBillingRegisterData;
  systemName?: string;
  orgName?: string;
  isAdmin?: boolean;
}

export default function POSBillingClient({
  initialData,
  systemName = 'Dilnova',
  orgName,
  isAdmin = false,
}: Props) {
  const posState = usePOSBilling(initialData);

  // Search & Scanner Ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Mode State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile Checkout Drawer State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  useEffect(() => {
    if (posState.data.branches && posState.data.branches.length > 0) {
      const defaultBranch = posState.data.branches.find((b) => b.isDefault) || posState.data.branches[0];
      requestAnimationFrame(() => {
        posState.setSelectedBranchId(defaultBranch.id);
      });
    }
  }, [posState.data.branches, posState.setSelectedBranchId]);

  // Fullscreen toggle event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.error('Fullscreen mode not supported on this device/browser.');
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Reset pagination when search or category changes
  useEffect(() => {
    posState.setCurrentPage(1);
  }, [posState.searchQuery, posState.categoryFilter, posState.setCurrentPage]);

  // Global POS Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === 'F2') && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        posState.setSearchQuery('');
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        posState.setCart([]);
        toast.info('Ticket cleared.');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [posState.setSearchQuery, posState.setCart]);

  return (
    <div className={`transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-zinc-100 dark:bg-zinc-950 p-3 overflow-y-auto' : ''}`}>
      {/* Clean Minimal Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {orgName || 'POS Register'}
          </span>
          <span className="text-xs text-zinc-400 font-medium hidden sm:inline">•</span>
          <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 hidden sm:inline">
            Point of Sale Register
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Branch Selector */}
          {posState.data.premiumStatus?.multiBranchActive ? (
            <select
              value={posState.selectedBranchId}
              onChange={(e) => {
                posState.setSelectedBranchId(e.target.value);
                posState.setCart([]);
              }}
              className="px-2.5 py-1 border border-zinc-200 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 font-bold focus:outline-none"
            >
              {posState.data.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏬 {b.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hidden sm:inline">
              🏬 {posState.data.branches.find((b) => b.id === posState.selectedBranchId)?.name || 'Main Register'}
            </span>
          )}

          {isAdmin && (
            <Link
              href="/vendor?tab=inventory"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hidden sm:inline"
            >
              Inventory
            </Link>
          )}

          <button
            onClick={toggleFullscreen}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 cursor-pointer"
            title="Toggle Fullscreen POS Terminal"
          >
            {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Main Responsive POS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Left Side: Product Catalog */}
        <div className="md:col-span-7 lg:col-span-8">
          <POSProductGrid
            searchQuery={posState.searchQuery}
            setSearchQuery={posState.setSearchQuery}
            categoryFilter={posState.categoryFilter}
            setCategoryFilter={posState.setCategoryFilter}
            paginatedProducts={posState.paginatedProducts}
            filteredProductsLength={posState.filteredProducts.length}
            currentPage={posState.currentPage}
            setCurrentPage={posState.setCurrentPage}
            totalPages={posState.totalPages}
            cart={posState.cart}
            addToCart={posState.addToCart}
            getProductStockInfo={posState.getProductStockInfo}
            isProductPurchasable={posState.isProductPurchasable}
            inventoryItems={posState.data.inventoryItems}
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Right Side: Desktop & Tablet Fixed Checkout Ticket Panel Card (Zero Outer Scroll) */}
        <div className="hidden md:block md:col-span-5 lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm sticky top-3 self-start h-[calc(100vh-100px)] max-h-[720px] overflow-hidden">
          <POSTicketPanel
            {...posState}
            handlePOSCheckout={() => posState.handlePOSCheckout(() => setIsMobileCartOpen(false))}
          />
        </div>
      </div>

      {/* Mobile Sticky Bottom Summary Bar (< md screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 text-white p-3 border-t border-zinc-800 shadow-2xl flex items-center justify-between">
        <div>
          <p className="text-[11px] text-zinc-400 font-bold">{posState.totalItemCount} items in ticket</p>
          <p className="text-base font-black font-mono text-emerald-400">${posState.totalAmount.toFixed(2)}</p>
        </div>
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer flex items-center gap-1.5"
        >
          <span>Checkout Ticket</span>
          <span>→</span>
        </button>
      </div>

      {/* Mobile Checkout Drawer Sheet (Zero Outer Scroll - ONLY items scroll!) */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl p-4 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
              <span className="font-extrabold text-xs uppercase tracking-wider text-zinc-500">Checkout Ticket</span>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden pt-2">
              <POSTicketPanel
                {...posState}
                handlePOSCheckout={() => posState.handlePOSCheckout(() => setIsMobileCartOpen(false))}
                isMobileSheet={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      <POSReceiptModal
        receiptToPrint={posState.receiptToPrint}
        setReceiptToPrint={posState.setReceiptToPrint}
        systemName={systemName}
      />
    </div>
  );
}
