'use client';

import { useState, useTransition, useEffect } from 'react';
import type { VendorBillingRegisterData } from '@/features/billing/types';
import {
  getVendorBillingRegisterData,
} from '@/features/billing/register.actions';
import {
  processBillingCheckoutAction,
} from '@/features/billing/checkout.actions';
import Image from 'next/image';
import { resolveEffectiveStockAvailability } from '@/features/inventory/availability.shared';
import { toast } from 'sonner';

interface Props {
  initialData: VendorBillingRegisterData;
  systemName?: string;
}

export default function POSBillingClient({ initialData, systemName = 'Dilnova' }: Props) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);

  // Re-fetch helper to keep UI fully in sync
  const refreshData = async () => {
    try {
      const fresh = await getVendorBillingRegisterData();
      setData(fresh);
    } catch (err) {
      toast.error('Failed to refresh data.');
    }
  };

  // Branch Selector (Premium POS Register requires branch selection)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  useEffect(() => {
    if (data.branches && data.branches.length > 0) {
      const defaultBranch = data.branches.find((b) => b.isDefault) || data.branches[0];
      requestAnimationFrame(() => {
        setSelectedBranchId(defaultBranch.id);
      });
    }
  }, [data.branches]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash');
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
        qty: 999999, // services have infinite virtual stock
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

  // Filter products that actually have inventory tracked
  const availableProducts = data.inventoryItems.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && isProductPurchasable(item);
  });

  const addToCart = (product: any) => {
    if (!isProductPurchasable(product)) {
      toast.error('This item is not available for sale.');
      return;
    }
    const stock = getProductStockInfo(product.productId);
    const existing = cart.find((item) => item.product.productId === product.productId);
    const currentQtyInCart = existing?.quantity ?? 0;

    if (stock.qty <= currentQtyInCart) {
      toast.error(`Insufficient stock! Only ${stock.qty} units available at this branch.`);
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
  };

  const updateCartQty = (productId: string, qty: number) => {
    const stock = getProductStockInfo(productId);
    if (qty > stock.qty) {
      toast.error(`Only ${stock.qty} units available.`);
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

  const handlePOSCheckout = () => {
    if (cart.length === 0) return;
    if (!selectedBranchId) {
      toast.error('Select a branch register first.');
      return;
    }

    startTransition(async () => {
      try {
        const payload = cart.map((item) => ({
          productId: item.product.productId,
          productName: item.product.productName,
          quantity: item.quantity,
          unitPrice: item.product.productPrice, // actual price in cents
        }));

        const result = await processBillingCheckoutAction({
          branchId: selectedBranchId,
          items: payload,
          paymentMethod,
          customerName,
          notes,
        });

        toast.success(`POS receipt processed. Order Total: $${(result.totalAmount / 100).toFixed(2)}`);

        // Save receipt info for print view
        setReceiptToPrint({
          id: result.receiptId,
          branchName: data.branches.find((b) => b.id === selectedBranchId)?.name || 'Branch Register',
          items: cart.map((i) => ({ name: i.product.productName, qty: i.quantity, price: i.product.productPrice / 100 })),
          total: result.totalAmount / 100,
          paymentMethod,
          customerName,
          date: new Date(),
        });

        setCart([]);
        setCustomerName('');
        setNotes('');
        await refreshData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'POS checkout failed.');
      }
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * (item.product.productPrice / 100), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-220px)] items-stretch">
      {/* Left side: Product Grid & Search */}
      <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-50">Point-of-Sale Register</h2>
              <p className="text-xs text-zinc-400">Click products below to add them to the ticket list.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Branch Register:</span>
              {data.premiumStatus?.multiBranchActive ? (
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setCart([]); // Clear cart when branch changes
                  }}
                  className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 font-bold focus:outline-none"
                >
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏬 {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  🏬 {data.branches.find((b) => b.id === selectedBranchId)?.name || 'Main Register'}
                </span>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 focus:outline-none"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {availableProducts.map((item) => {
              const info = getProductStockInfo(item.productId);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={info.qty <= 0}
                  className={`p-3 border rounded-xl text-left transition-all active:scale-[0.97] hover:border-indigo-400 group flex flex-col justify-between h-28 ${
                    info.qty <= 0
                      ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/20'
                      : 'bg-white hover:bg-zinc-50/50 dark:bg-zinc-900'
                  }`}
                >
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate w-full">{item.productName}</span>
                  <div>
                    <span className="text-[10px] text-zinc-450 block font-mono">SKU: {info.sku}</span>
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-zinc-50 dark:border-zinc-800">
                      <span className="text-xs font-black font-mono text-zinc-850 dark:text-white">${((item.productPrice ?? 0) / 100).toFixed(2)}</span>
                      {item.productType === 'service' ? (
                        <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Service</span>
                      ) : (
                        <span className={`text-[9px] font-bold ${info.qty <= 5 ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>
                          {info.qty} left
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {availableProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-400 font-mono text-xs">No active inventory products tracked.</div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Cart Summary */}
      <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            Active Checkout Ticket
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.product.productId} className="flex justify-between items-center text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">{item.product.productName}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">${(item.product.productPrice / 100).toFixed(2)} each</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => updateCartQty(item.product.productId, item.quantity - 1)}
                    className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-xs">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQty(item.product.productId, item.quantity + 1)}
                    className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-xs text-zinc-450 text-center py-12 font-mono">Ticket is empty.</p>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3.5 space-y-3.5">
          <div className="flex justify-between text-xs font-black">
            <span>Ticket Total:</span>
            <span className="font-mono text-sm">${totalAmount.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer Name"
              className="w-full px-3 py-2 border border-zinc-205 rounded-xl text-xs"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-zinc-205 rounded-xl text-xs"
            >
              <option value="cash">💵 Cash Tendered</option>
              <option value="card">💳 Card Terminal</option>
              <option value="other">Store Credit/Other</option>
            </select>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receipt checkout notes..."
              rows={2}
              className="w-full px-3 py-2 border border-zinc-205 rounded-xl text-xs resize-none"
            />
          </div>

          <button
            onClick={handlePOSCheckout}
            disabled={cart.length === 0 || isPending}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-97 disabled:opacity-50"
          >
            ✓ Complete Checkout & Print Receipt
          </button>
        </div>

        {/* --- Print Receipt Dialog --- */}
        {receiptToPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm border border-zinc-200 shadow-2xl space-y-4">
              <div className="text-center">
                <h3 className="font-black text-lg">{systemName} Point-of-Sale</h3>
                <p className="text-xs text-zinc-500">Receipt ID: {receiptToPrint.id}</p>
                <p className="text-xs text-zinc-500">Branch: {receiptToPrint.branchName}</p>
              </div>
              <div className="border-t border-b border-dashed border-zinc-300 py-3 text-xs space-y-1.5 font-mono">
                {receiptToPrint.items.map((i: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{i.name} x{i.qty}</span>
                    <span>${(i.price * i.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-zinc-300 pt-2 flex justify-between font-bold">
                  <span>TOTAL PAID ({receiptToPrint.paymentMethod.toUpperCase()}):</span>
                  <span>${receiptToPrint.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-center text-xs text-zinc-400">
                <p>Customer: {receiptToPrint.customerName || 'Walk-in'}</p>
                <p>Thank you for shopping with us!</p>
              </div>
              <button
                onClick={() => setReceiptToPrint(null)}
                className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Print Dialog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
