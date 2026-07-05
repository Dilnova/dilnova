'use client';

import { useState, useTransition, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import type { VendorBillingRegisterData } from '@/features/billing/types';
import { getVendorBillingRegisterData } from '@/features/billing/register.actions';
import { processBillingCheckoutAction } from '@/features/billing/checkout.actions';
import { resolveEffectiveStockAvailability } from '@/features/inventory/availability.shared';
import { toast } from 'sonner';

interface Props {
  initialData: VendorBillingRegisterData;
  systemName?: string;
  orgName?: string;
  isAdmin?: boolean;
}

// Web Audio API Synthesizer for instant POS sound effects
const playAudioFeedback = (type: 'scan' | 'checkout' | 'error') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'scan') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } else if (type === 'checkout') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Ignore audio errors if context is blocked prior to user interaction
  }
};

export default function POSBillingClient({
  initialData,
  systemName = 'Dilnova',
  orgName,
  isAdmin = false,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);

  // Search & Scanner Ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Mode State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile Checkout Drawer State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Re-fetch helper to keep UI fully in sync
  const refreshData = async () => {
    try {
      const fresh = await getVendorBillingRegisterData();
      setData(fresh);
    } catch (err) {
      toast.error('Failed to refresh data.');
    }
  };

  // Branch Selector
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  useEffect(() => {
    if (data.branches && data.branches.length > 0) {
      const defaultBranch = data.branches.find((b) => b.isDefault) || data.branches[0];
      requestAnimationFrame(() => {
        setSelectedBranchId(defaultBranch.id);
      });
    }
  }, [data.branches]);

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

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'products' | 'services' | 'low_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // Cart State & Ticket Optimizations
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [receiptToPrint, setReceiptToPrint] = useState<any>(null);

  const availabilityCatalog = data.stockAvailabilityCatalog || [];

  const isProductPurchasable = (item: (typeof data.inventoryItems)[number]) => {
    if (item.productType === 'service') return true;
    if (!item.id) return false;
    const availability = resolveEffectiveStockAvailability(
      availabilityCatalog,
      item.stockAvailability,
      item.quantity ?? 0
    );
    return availability?.allowsPurchase ?? false;
  };

  const getProductStockInfo = (productId: string) => {
    const prod = data.inventoryItems.find((i) => i.productId === productId);
    if (prod?.productType === 'service') {
      return {
        qty: 999999,
        sku: 'Service',
        binLocation: 'N/A',
      };
    }
    if (selectedBranchId) {
      const bInv = data.branchInventory.find(
        (bi) => bi.branchId === selectedBranchId && bi.productId === productId
      );
      return {
        qty: bInv?.quantity ?? 0,
        sku: bInv?.sku || '—',
        binLocation: bInv?.binLocation || '—',
      };
    }
    const cInv = data.inventoryItems.find((i) => i.productId === productId);
    return {
      qty: cInv?.quantity ?? 0,
      sku: cInv?.sku || '—',
      binLocation: cInv?.binLocation || '—',
    };
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return data.inventoryItems.filter((item) => {
      if (!isProductPurchasable(item)) return false;

      // Category filter
      if (categoryFilter === 'products' && item.productType !== 'product') return false;
      if (categoryFilter === 'services' && item.productType !== 'service') return false;

      const info = getProductStockInfo(item.productId);
      if (categoryFilter === 'low_stock' && (item.productType === 'service' || info.qty > 5)) return false;

      // Search query
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const matchesName = item.productName.toLowerCase().includes(query);
      const matchesSku = item.sku ? item.sku.toLowerCase().includes(query) : false;
      const matchesId = item.productId.toLowerCase() === query;

      return matchesName || matchesSku || matchesId;
    });
  }, [data.inventoryItems, searchQuery, categoryFilter, selectedBranchId]);

  // Reset pagination when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const addToCart = (product: any, playSound = true) => {
    if (!isProductPurchasable(product)) {
      toast.error('This item is not available for sale.');
      playAudioFeedback('error');
      return;
    }
    const stock = getProductStockInfo(product.productId);
    const existing = cart.find((item) => item.product.productId === product.productId);
    const currentQtyInCart = existing?.quantity ?? 0;

    if (stock.qty <= currentQtyInCart) {
      toast.error(`Insufficient stock! Only ${stock.qty} units available.`);
      playAudioFeedback('error');
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    if (playSound) {
      playAudioFeedback('scan');
    }
  };

  const updateCartQty = (productId: string, qty: number) => {
    const stock = getProductStockInfo(productId);
    if (qty > stock.qty) {
      toast.error(`Only ${stock.qty} units available.`);
      playAudioFeedback('error');
      return;
    }
    if (qty <= 0) {
      setCart(cart.filter((item) => item.product.productId !== productId));
    } else {
      setCart(
        cart.map((item) =>
          item.product.productId === productId ? { ...item, quantity: qty } : item
        )
      );
    }
  };

  const removeCartItem = (productId: string) => {
    setCart(cart.filter((item) => item.product.productId !== productId));
  };

  // Barcode Scanner / Instant Enter handler
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

      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0], true);
        toast.success(`Added: ${filteredProducts[0].productName}`);
        setSearchQuery('');
        return;
      }

      if (filteredProducts.length === 0) {
        playAudioFeedback('error');
        toast.error(`Barcode/SKU "${searchQuery}" not found.`);
      }
    }
  };

  // Global POS Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === 'F2') && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCart([]);
        toast.info('Ticket cleared.');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const subtotalAmount = cart.reduce((sum, item) => sum + item.quantity * (item.product.productPrice / 100), 0);
  const discountAmount = (subtotalAmount * discountPercent) / 100;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cashTenderedVal = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashTenderedVal - totalAmount);

  const handlePOSCheckout = () => {
    if (cart.length === 0) return;
    if (!selectedBranchId) {
      toast.error('Select a branch register first.');
      playAudioFeedback('error');
      return;
    }

    if (paymentMethod === 'cash' && cashTenderedVal < totalAmount && cashTenderedVal > 0) {
      toast.error(`Cash tendered ($${cashTenderedVal.toFixed(2)}) is less than total ($${totalAmount.toFixed(2)}).`);
      playAudioFeedback('error');
      return;
    }

    startTransition(async () => {
      try {
        const payload = cart.map((item) => {
          const effectivePriceCents = Math.round(
            (item.product.productPrice * (100 - discountPercent)) / 100
          );
          return {
            productId: item.product.productId,
            productName: item.product.productName,
            quantity: item.quantity,
            unitPrice: effectivePriceCents,
          };
        });

        const result = await processBillingCheckoutAction({
          branchId: selectedBranchId,
          items: payload,
          paymentMethod,
          customerName,
          notes,
        });

        playAudioFeedback('checkout');
        toast.success(`POS receipt processed! Total: $${(result.totalAmount / 100).toFixed(2)}`);

        setReceiptToPrint({
          id: result.receiptId,
          branchName: data.branches.find((b) => b.id === selectedBranchId)?.name || 'Main Register',
          items: cart.map((i) => ({
            name: i.product.productName,
            qty: i.quantity,
            price: (i.product.productPrice * (100 - discountPercent)) / 10000,
          })),
          subtotal: subtotalAmount,
          discountPercent,
          discountAmount,
          total: result.totalAmount / 100,
          paymentMethod,
          cashTendered: paymentMethod === 'cash' ? cashTenderedVal : null,
          changeDue: paymentMethod === 'cash' ? changeDue : null,
          customerName,
          date: new Date(),
        });

        setCart([]);
        setCustomerName('');
        setNotes('');
        setCashTendered('');
        setDiscountPercent(0);
        setIsMobileCartOpen(false);
        await refreshData();
      } catch (err) {
        playAudioFeedback('error');
        toast.error(err instanceof Error ? err.message : 'POS checkout failed.');
      }
    });
  };

  // Render Optimized Checkout Ticket Panel (Strictly 0 outer card scroll - ONLY items scroll!)
  const renderTicketPanel = (isMobileSheet = false) => (
    <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden">
      {/* Pinned Ticket Top Header & Scrollable Items Container */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-xs tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
              Checkout Ticket
            </h3>
            {totalItemCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setDiscountPercent(0);
                playAudioFeedback('error');
              }}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Ticket
            </button>
          )}
        </div>

        {/* Cart Item List - ONLY THIS ELEMENT HAS OVERFLOW SCROLL */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {cart.map((item) => (
            <div
              key={item.product.productId}
              className="flex justify-between items-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 text-xs shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block truncate">
                  {item.product.productName}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                  <span>${(item.product.productPrice / 100).toFixed(2)} ea</span>
                  <span>•</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    ${((item.quantity * item.product.productPrice) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => updateCartQty(item.product.productId, item.quantity - 1)}
                  className="w-6 h-6 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 active:scale-95 cursor-pointer shadow-2xs"
                  aria-label="Decrease quantity"
                >
                  -
                </button>

                <span className="w-6 text-center font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() => updateCartQty(item.product.productId, item.quantity + 1)}
                  className="w-6 h-6 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 active:scale-95 cursor-pointer shadow-2xs"
                  aria-label="Increase quantity"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => removeCartItem(item.product.productId)}
                  className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-xs font-bold cursor-pointer ml-0.5"
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="text-center py-8 text-zinc-400 font-mono text-xs space-y-1">
              <p className="text-xl">🛒</p>
              <p>Ticket is empty</p>
              <p className="text-[10px] text-zinc-400">Scan barcode or select products to add</p>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Fixed Ticket Footer & Payment Controls */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-2 flex-shrink-0">
        {/* Quick Discount Selector */}
        {cart.length > 0 && (
          <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Discount:</span>
            <div className="flex gap-1">
              {[0, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    discountPercent === pct
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200'
                  }`}
                >
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="space-y-0.5 text-xs">
          {discountPercent > 0 && (
            <div className="flex justify-between text-zinc-500 text-[11px]">
              <span>Subtotal:</span>
              <span className="font-mono">${subtotalAmount.toFixed(2)}</span>
            </div>
          )}
          {discountPercent > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
              <span>Discount ({discountPercent}%):</span>
              <span className="font-mono">-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-0.5">
            <span className="text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-extrabold text-[11px]">
              Total Due:
            </span>
            <span className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ${totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name (Optional)"
            className="w-full px-2.5 py-1 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 focus:outline-none"
          />

          <div className="grid grid-cols-3 gap-1">
            {(['cash', 'card', 'other'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  paymentMethod === method
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {method === 'cash' ? '💵 Cash' : method === 'card' ? '💳 Card' : '⭐ Other'}
              </button>
            ))}
          </div>

          {/* Cash Tendered & Change Calculator */}
          {paymentMethod === 'cash' && (
            <div className="p-1.5 rounded-xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300 text-[10px]">Tendered:</span>
                <input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={`$${totalAmount.toFixed(2)}`}
                  className="w-20 px-2 py-0.5 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-right font-mono font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              {/* Quick Cash Preset Buttons */}
              <div className="flex gap-1">
                {[10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt.toString())}
                    className="flex-1 py-0.5 rounded bg-white dark:bg-zinc-900 border border-amber-300/60 dark:border-amber-800 text-[10px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 cursor-pointer"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashTendered(totalAmount.toFixed(2))}
                  className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-amber-300/60 dark:border-amber-800 text-[10px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 cursor-pointer"
                >
                  Exact
                </button>
              </div>

              {cashTenderedVal > 0 && (
                <div className="flex justify-between items-center text-xs pt-0.5 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="font-bold text-amber-950 dark:text-amber-200 text-[10px]">Change Due:</span>
                  <span
                    className={`font-mono font-black text-xs ${
                      cashTenderedVal >= totalAmount
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    ${changeDue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Receipt checkout notes..."
            rows={1}
            className="w-full px-2.5 py-1 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 resize-none focus:outline-none"
          />
        </div>

        <button
          onClick={handlePOSCheckout}
          disabled={cart.length === 0 || isPending}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isPending ? (
            <span>Processing...</span>
          ) : (
            <span>✓ Complete Checkout (${totalAmount.toFixed(2)})</span>
          )}
        </button>
      </div>
    </div>
  );

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
          {data.premiumStatus?.multiBranchActive ? (
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setCart([]);
              }}
              className="px-2.5 py-1 border border-zinc-200 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 font-bold focus:outline-none"
            >
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏬 {b.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hidden sm:inline">
              🏬 {data.branches.find((b) => b.id === selectedBranchId)?.name || 'Main Register'}
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
        <div className="md:col-span-7 lg:col-span-8 bg-white border border-zinc-200 rounded-2xl p-3.5 sm:p-4 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm space-y-3">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                onClick={() => setCategoryFilter(tab.id as any)}
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
              {filteredProducts.length} items
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
                      : 'bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800'
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

            {filteredProducts.length === 0 && (
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

        {/* Right Side: Desktop & Tablet Fixed Checkout Ticket Panel Card (Zero Outer Scroll) */}
        <div className="hidden md:block md:col-span-5 lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm sticky top-3 self-start h-[calc(100vh-100px)] max-h-[720px] overflow-hidden">
          {renderTicketPanel(false)}
        </div>
      </div>

      {/* Mobile Sticky Bottom Summary Bar (< md screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 text-white p-3 border-t border-zinc-800 shadow-2xl flex items-center justify-between">
        <div>
          <p className="text-[11px] text-zinc-400 font-bold">{totalItemCount} items in ticket</p>
          <p className="text-base font-black font-mono text-emerald-400">${totalAmount.toFixed(2)}</p>
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
              {renderTicketPanel(true)}
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white text-zinc-900 p-6 rounded-2xl w-full max-w-sm border border-zinc-200 shadow-2xl space-y-4 print:shadow-none print:border-none print:w-full">
            <div className="text-center space-y-1">
              <h3 className="font-black text-base">{systemName} Receipt</h3>
              <p className="text-[11px] text-zinc-500 font-mono">ID: {receiptToPrint.id}</p>
              <p className="text-[11px] text-zinc-500 font-bold">Branch: {receiptToPrint.branchName}</p>
              <p className="text-[10px] text-zinc-400">{new Date(receiptToPrint.date).toLocaleString()}</p>
            </div>

            <div className="border-t border-b border-dashed border-zinc-300 py-3 text-xs space-y-2 font-mono">
              {receiptToPrint.items.map((i: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>
                    {i.name} x{i.qty}
                  </span>
                  <span>${(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}

              {receiptToPrint.discountPercent > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({receiptToPrint.discountPercent}%):</span>
                  <span>-${receiptToPrint.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-dashed border-zinc-300 pt-2 flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>${receiptToPrint.total.toFixed(2)}</span>
              </div>

              {receiptToPrint.paymentMethod === 'cash' && receiptToPrint.cashTendered != null && (
                <div className="pt-1 text-[11px] text-zinc-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span>${receiptToPrint.cashTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-900">
                    <span>Change Due:</span>
                    <span>${receiptToPrint.changeDue.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-zinc-500 space-y-1">
              <p>Customer: {receiptToPrint.customerName || 'Walk-in Customer'}</p>
              <p className="font-semibold text-zinc-700">Thank you!</p>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-zinc-800"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setReceiptToPrint(null)}
                className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-zinc-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
