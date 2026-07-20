'use client';

import { useState, useTransition } from 'react';
import {
  vendorAdjustInventoryAction,
  vendorInitInventoryAction,
} from '@/features/inventory/vendor-stock.actions';

interface VendorStockTabProps {
  data: any; // We'll replace this with proper typing later during the TS cleanup
  selectedBranchId: string;
  refreshData: () => void;
  triggerNotification: (success: boolean, text: string) => void;
  getProductStockInfo: (productId: string) => { qty: number; sku: string; binLocation: string; isBranch: boolean };
}

export default function VendorStockTab({
  data,
  selectedBranchId,
  refreshData,
  triggerNotification,
  getProductStockInfo,
}: VendorStockTabProps) {
  const [isPending, startTransition] = useTransition();

  // --- Filtering States ---
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // --- Modals State ---
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<'restock' | 'manual_adjustment' | 'damage_loss'>('restock');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [initProductId, setInitProductId] = useState('');
  const [initSku, setInitSku] = useState('');
  const [initQty, setInitQty] = useState('0');
  const [initThreshold, setInitThreshold] = useState('5');
  const [initBin, setInitBin] = useState('');
  const [initSupplierId, setInitSupplierId] = useState('');

  // --- Filters ---
  const filteredStock = data.inventoryItems.filter((item: any) => {
    if (item.productType === 'service') return false; // Exclude services from stock levels
    const info = getProductStockInfo(item.productId);
    const matchesSearch =
      !stockSearch.trim() ||
      item.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (info.sku && info.sku.toLowerCase().includes(stockSearch.toLowerCase()));

    const isLow = info.qty > 0 && info.qty <= (item.lowStockThreshold ?? 5);
    const isOut = info.qty === 0;

    const matchesFilter =
      stockFilter === 'all' || (stockFilter === 'low' && isLow) || (stockFilter === 'out' && isOut);

    return matchesSearch && matchesFilter;
  });

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      triggerNotification(false, 'Please enter a valid positive quantity.');
      return;
    }
    const finalChange = adjustType === 'damage_loss' ? -qty : qty;

    startTransition(async () => {
      try {
        await vendorAdjustInventoryAction({
          inventoryId: adjustingItem.id,
          quantityChange: finalChange,
          type: adjustType,
          reason: adjustReason,
          branchId: selectedBranchId || undefined,
        });
        triggerNotification(true, 'Central inventory updated.');
        setIsAdjustModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Adjustment failed.');
      }
    });
  };

  const handleInitInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initProductId) {
      triggerNotification(false, 'Please select a product.');
      return;
    }
    startTransition(async () => {
      try {
        await vendorInitInventoryAction({
          productId: initProductId,
          sku: initSku || undefined,
          quantity: parseInt(initQty, 10) || 0,
          lowStockThreshold: parseInt(initThreshold, 10) || 5,
          binLocation: initBin || undefined,
          supplierId: initSupplierId || undefined,
        });
        triggerNotification(true, 'Tracking initialized.');
        setIsInitModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to init tracking.');
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        <input
          type="text"
          value={stockSearch}
          onChange={(e) => setStockSearch(e.target.value)}
          placeholder="Search SKU or name..."
          className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 focus:outline-none"
        />
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          {(['all', 'low', 'out'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer whitespace-nowrap ${
                stockFilter === f
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500'
              }`}
            >
              {f === 'all' ? 'All' : f === 'low' ? '⚠️ Low' : '🚫 Out'}
            </button>
          ))}
        </div>

        {data.productsWithoutInventory.length > 0 && (
          <button
            onClick={() => setIsInitModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.97] sm:ml-auto whitespace-nowrap"
          >
            + Init Stock Tracking
          </button>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono uppercase text-[9px]">
              <th className="p-3">Product</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Threshold</th>
              <th className="p-3">Location</th>
              <th className="p-3">Supplier</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {filteredStock.map((item: any) => {
              const info = getProductStockInfo(item.productId);
              return (
                <tr key={item.id} className="hover:bg-zinc-50/30">
                  <td className="p-3 font-bold text-zinc-900 dark:text-zinc-200">{item.productName}</td>
                  <td className="p-3 font-mono text-zinc-500">{info.sku}</td>
                  <td className="p-3 font-black text-sm text-zinc-900 dark:text-zinc-200">{info.qty}</td>
                  <td className="p-3 text-zinc-500">{item.lowStockThreshold}</td>
                  <td className="p-3 text-zinc-500">{info.binLocation}</td>
                  <td className="p-3 text-zinc-500">{item.supplierName || '—'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setAdjustingItem(item);
                        setAdjustQty('');
                        setAdjustReason('');
                        setIsAdjustModalOpen(true);
                      }}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg font-bold"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- Adjust Stock Modal --- */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Adjust Stock</h2>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                >
                  <option value="restock">Restock (+)</option>
                  <option value="manual_adjustment">Manual Adjustment (+)</option>
                  <option value="damage_loss">Damage/Loss (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Broken in transit"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Init Stock Modal --- */}
      {isInitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Initialize Stock Tracking</h2>
            <form onSubmit={handleInitInventory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Product</label>
                <select
                  required
                  value={initProductId}
                  onChange={(e) => setInitProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                >
                  <option value="">Select a product...</option>
                  {data.productsWithoutInventory.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">SKU</label>
                  <input
                    type="text"
                    value={initSku}
                    onChange={(e) => setInitSku(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Bin / Aisle</label>
                  <input
                    type="text"
                    value={initBin}
                    onChange={(e) => setInitBin(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Initial Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={initQty}
                    onChange={(e) => setInitQty(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Low Alert At</label>
                  <input
                    type="number"
                    min="0"
                    value={initThreshold}
                    onChange={(e) => setInitThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Supplier (Optional)</label>
                <select
                  value={initSupplierId}
                  onChange={(e) => setInitSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                >
                  <option value="">None</option>
                  {data.suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInitModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Init Tracking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
