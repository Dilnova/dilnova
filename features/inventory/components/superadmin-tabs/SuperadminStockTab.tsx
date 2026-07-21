'use client';

import { useState, useTransition } from 'react';
import { adjustInventoryAction, createInventoryForProductAction } from '@/features/inventory/superadmin.actions';
import { toast } from 'sonner';
import { InventoryItem, ProductForInventory, Supplier } from '../inventory.types';
import InventoryModal from '../InventoryModal';

interface SuperadminStockTabProps {
  inventoryItems: InventoryItem[];
  productsWithoutInventory: ProductForInventory[];
  suppliers: Supplier[];
}

export default function SuperadminStockTab({
  inventoryItems,
  productsWithoutInventory,
  suppliers,
}: SuperadminStockTabProps) {
  const [isPending, startTransition] = useTransition();

  // ── Stock Filters ──
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // ── Adjust Stock Modal State ──
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'restock' | 'manual_adjustment' | 'damage_loss'>('restock');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // ── Init Inventory Modal ──
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [initProductId, setInitProductId] = useState('');
  const [initSku, setInitSku] = useState('');
  const [initQty, setInitQty] = useState('0');
  const [initThreshold, setInitThreshold] = useState('5');
  const [initBin, setInitBin] = useState('');
  const [initSupplierId, setInitSupplierId] = useState('');

  // ── Filtered Data ──
  const filteredStock = inventoryItems.filter((item) => {
    const matchesSearch =
      !stockSearch.trim() ||
      item.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(stockSearch.toLowerCase()));
    const matchesFilter =
      stockFilter === 'all' ||
      (stockFilter === 'low' && item.quantity > 0 && item.quantity <= item.lowStockThreshold) ||
      (stockFilter === 'out' && item.quantity === 0);
    return matchesSearch && matchesFilter;
  });

  const totalItems = inventoryItems.length;

  // ── Handlers ──
  const openAdjustStock = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustType('restock');
    setAdjustQty('');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty === 0) {
      toast.error('Quantity must be a non-zero number.');
      return;
    }
    const change = adjustType === 'damage_loss' ? -Math.abs(qty) : Math.abs(qty);

    startTransition(async () => {
      try {
        await adjustInventoryAction({
          inventoryId: adjustingItem.id,
          quantityChange: change,
          type: adjustType,
          reason: adjustReason,
        });
        toast.success(`Stock adjusted: ${change > 0 ? '+' : ''}${change} units.`);
        setIsAdjustModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to adjust stock.');
      }
    });
  };

  const openInitInventory = () => {
    setInitProductId('');
    setInitSku('');
    setInitQty('0');
    setInitThreshold('5');
    setInitBin('');
    setInitSupplierId('');
    setIsInitModalOpen(true);
  };

  const handleInitInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initProductId) {
      toast.error('Select a product.');
      return;
    }
    startTransition(async () => {
      try {
        await createInventoryForProductAction({
          productId: initProductId,
          sku: initSku || undefined,
          quantity: parseInt(initQty, 10) || 0,
          lowStockThreshold: parseInt(initThreshold, 10) || 5,
          binLocation: initBin || undefined,
          supplierId: initSupplierId || undefined,
        });
        toast.success('Inventory record created.');
        setIsInitModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create inventory.');
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 shadow-sm">
        {/* Search */}
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            placeholder="Search product name or SKU..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-zinc-200 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
          />
        </div>
        {/* Filters + Init */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
            {(['all', 'low', 'out'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  stockFilter === f
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {f === 'all' ? 'All' : f === 'low' ? '⚠️ Low' : '🚫 Out'}
              </button>
            ))}
          </div>
          {productsWithoutInventory.length > 0 && (
            <button
              onClick={openInitInventory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-[0.97] whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Init Stock</span>
              <span className="sm:hidden">+</span>
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {(stockSearch || stockFilter !== 'all') && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono px-1">
          Showing {filteredStock.length} of {totalItems} items
        </p>
      )}

      {/* Stock Table */}
      <div className="bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">SKU</th>
                <th className="py-2.5 px-4">Qty</th>
                <th className="py-2.5 px-4">Threshold</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Supplier</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredStock.map((item) => {
                const isLow = item.quantity > 0 && item.quantity <= item.lowStockThreshold;
                const isOut = item.quantity === 0;
                return (
                  <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-200">{item.productName}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          item.productType === 'service' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                        }`}>
                          {item.productType}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500">{item.sku || '—'}</td>
                    <td className="py-3 px-4 font-mono font-black text-zinc-900 dark:text-zinc-100">{item.quantity}</td>
                    <td className="py-3 px-4 font-mono text-zinc-500">{item.lowStockThreshold}</td>
                    <td className="py-3 px-4 text-zinc-500">{item.binLocation || '—'}</td>
                    <td className="py-3 px-4 text-zinc-500">{item.supplierName || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 uppercase">
                        {(item.stockAvailability || 'in_stock').replace(/_/g, ' ')}
                      </span>
                      {isLow && !isOut && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">LOW QTY</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openAdjustStock(item)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStock.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-zinc-500 dark:text-zinc-400 font-mono text-sm">No inventory records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {filteredStock.map((item) => {
            const isLow = item.quantity > 0 && item.quantity <= item.lowStockThreshold;
            const isOut = item.quantity === 0;
            return (
              <div key={item.id} className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.productName}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{item.sku || 'No SKU'} · {item.binLocation || 'No location'}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-100">{item.quantity}</p>
                    {isOut ? (
                      <span className="text-[9px] font-bold text-rose-600">OUT</span>
                    ) : isLow ? (
                      <span className="text-[9px] font-bold text-amber-600">LOW</span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-600">OK</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openAdjustStock(item)}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Adjust Stock
                </button>
              </div>
            );
          })}
          {filteredStock.length === 0 && (
            <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-xs font-mono">No inventory records found.</div>
          )}
        </div>
      </div>

      {/* ── Adjust Stock Modal ── */}
      {isAdjustModalOpen && adjustingItem && (
        <InventoryModal isOpen={true} onClose={() => setIsAdjustModalOpen(false)}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Adjust Stock: {adjustingItem.productName}</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">Current quantity: {adjustingItem.quantity}</p>
            </div>
            <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="adjustType" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Type</label>
                <select id="adjustType" value={adjustType} onChange={(e) => setAdjustType(e.target.value as typeof adjustType)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
                  <option value="restock">📥 Restock (add units)</option>
                  <option value="manual_adjustment">🔧 Manual Adjustment</option>
                  <option value="damage_loss">⚠️ Damage/Loss (remove units)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="adjustQty" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Quantity <span className="text-rose-500">*</span></label>
                <input id="adjustQty" type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="adjustReason" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Reason</label>
                <input id="adjustReason" type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="e.g. New shipment received" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">Apply</button>
              </div>
            </form>
        </InventoryModal>
      )}

      {/* ── Init Inventory Modal ── */}
      {isInitModalOpen && (
        <InventoryModal isOpen={true} onClose={() => setIsInitModalOpen(false)}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Initialize Stock Record</h3>
            </div>
            <form onSubmit={handleInitInventory} className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="initProductId" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Select Product <span className="text-rose-500">*</span></label>
                <select id="initProductId" value={initProductId} onChange={(e) => setInitProductId(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
                  <option value="">-- Choose a product --</option>
                  {productsWithoutInventory.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="initSupplierId" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Supplier</label>
                <select id="initSupplierId" value={initSupplierId} onChange={(e) => setInitSupplierId(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
                  <option value="">-- Select supplier (optional) --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.orgId})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="initQty" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Initial Qty</label>
                  <input id="initQty" type="number" min="0" value={initQty} onChange={(e) => setInitQty(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="initThreshold" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Low Threshold</label>
                  <input id="initThreshold" type="number" min="0" value={initThreshold} onChange={(e) => setInitThreshold(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="initSku" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">SKU (Optional)</label>
                  <input id="initSku" type="text" value={initSku} onChange={(e) => setInitSku(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" placeholder="SKU-123" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="initBin" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Location</label>
                  <input id="initBin" type="text" value={initBin} onChange={(e) => setInitBin(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="A1-Shelf" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsInitModalOpen(false)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">Create Record</button>
              </div>
            </form>
        </InventoryModal>
      )}
    </div>
  );
}
