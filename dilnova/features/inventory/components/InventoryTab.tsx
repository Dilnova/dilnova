'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  isActiveSimulatedOrder,
  formatOrderStatusLabel,
  matchesOrderStatusFilter,
} from '@/features/orders/status';
import { describeOrderCheckout, type CheckoutOptionDefinition } from '@/features/organization/checkout-options.shared';
import { getOrderDisplayTotals } from '@/features/billing/checkout-totals';
import {
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
  adjustInventoryAction,
  updateInventoryDetailsAction,
  createInventoryForProductAction,
  updateSimulatedOrderStatusAction,
  updateOrgImsLicenseAction,
} from '@/features/inventory/superadmin.actions';

// ── Interfaces ──

export interface InventoryItem {
  id: string;
  productId: string;
  sku: string | null;
  quantity: number;
  lowStockThreshold: number;
  binLocation: string | null;
  supplierId: string | null;
  stockAvailability: string;
  updatedAt: Date;
  productName: string;
  productType: string;
  productOrgId: string;
  supplierName: string | null;
}

export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  type: string;
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  userId: string;
  createdAt: Date;
  productName: string | null;
}

export interface SimulatedOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
  status: string;
  fulfillmentMethod: string;
  paymentMethod: string;
  pickupBranchId: string | null;
  pickupBranchName?: string | null;
  paymentSlipUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    productName: string;
    vendorOrgId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface ProductForInventory {
  id: string;
  name: string;
  type: string;
  orgId: string;
}

interface InventoryTabProps {
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  movements: InventoryMovement[];
  simulatedOrders: SimulatedOrder[];
  productsWithoutInventory: ProductForInventory[];
  checkoutOptionsCatalog: CheckoutOptionDefinition[];
  triggerNotification: (success: boolean, text: string) => void;
  organizations: {
    id: string;
    name: string;
    slug: string | null;
    imageUrl: string;
    publicMetadata: Record<string, any>;
  }[];
}

// ── SUB-TABS ──
type InventorySubTab = 'stock' | 'suppliers' | 'orders' | 'audit' | 'licenses';

export default function InventoryTab({
  inventoryItems,
  suppliers,
  movements,
  simulatedOrders,
  productsWithoutInventory,
  checkoutOptionsCatalog,
  triggerNotification,
  organizations,
}: InventoryTabProps) {
  const [subTab, setSubTab] = useState<InventorySubTab>('stock');
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    requestAnimationFrame(() => {
      setNow(Date.now());
    });
  }, []);

  // ── Stock Filters ──
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // ── Supplier Modal State ──
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierOrgId, setSupplierOrgId] = useState('');
  const [supplierContactName, setSupplierContactName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  // ── Adjust Stock Modal State ──
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'restock' | 'manual_adjustment' | 'damage_loss'>('restock');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // ── IMS License Modal State ──
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [managingOrg, setManagingOrg] = useState<any | null>(null);
  const [licenseImsEnabled, setLicenseImsEnabled] = useState(false);
  const [licenseImsExpiresAt, setLicenseImsExpiresAt] = useState('');
  const [licenseImsMultiBranchEnabled, setLicenseImsMultiBranchEnabled] = useState(false);
  const [licenseImsBillingEnabled, setLicenseImsBillingEnabled] = useState(false);

  // ── Init Inventory Modal ──
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [initProductId, setInitProductId] = useState('');
  const [initSku, setInitSku] = useState('');
  const [initQty, setInitQty] = useState('0');
  const [initThreshold, setInitThreshold] = useState('5');
  const [initBin, setInitBin] = useState('');
  const [initSupplierId, setInitSupplierId] = useState('');

  // ── Order Filter ──
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    'all' | 'pending' | 'pending_payment' | 'payment_submitted' | 'fulfilled' | 'cancelled'
  >('all');

  // ── Movement Filter ──
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');

  // ── Filtered Data ──
  const filteredStock = inventoryItems.filter((item) => {
    const matchesSearch = !stockSearch.trim() ||
      item.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(stockSearch.toLowerCase()));
    const matchesFilter =
      stockFilter === 'all' ||
      (stockFilter === 'low' && item.quantity > 0 && item.quantity <= item.lowStockThreshold) ||
      (stockFilter === 'out' && item.quantity === 0);
    return matchesSearch && matchesFilter;
  });

  const filteredOrders = simulatedOrders.filter((o) =>
    matchesOrderStatusFilter(o.status, orderStatusFilter)
  );

  const filteredMovements = movements.filter((m) =>
    movementTypeFilter === 'all' || m.type === movementTypeFilter
  );

  // ── Stats ──
  const totalItems = inventoryItems.length;
  const lowStockCount = inventoryItems.filter((i) => i.quantity > 0 && i.quantity <= i.lowStockThreshold).length;
  const outOfStockCount = inventoryItems.filter((i) => i.quantity === 0).length;
  const totalUnits = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);

  // ── Handlers ──

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierOrgId('');
    setSupplierContactName('');
    setSupplierEmail('');
    setSupplierPhone('');
    setSupplierAddress('');
    setIsSupplierModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierName(s.name);
    setSupplierOrgId(s.orgId);
    setSupplierContactName(s.contactName || '');
    setSupplierEmail(s.email || '');
    setSupplierPhone(s.phone || '');
    setSupplierAddress(s.address || '');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingSupplier) {
          await updateSupplierAction({
            id: editingSupplier.id,
            name: supplierName,
            contactName: supplierContactName,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          triggerNotification(true, 'Supplier updated.');
        } else {
          if (!supplierOrgId) {
            triggerNotification(false, 'Organization ID is required.');
            return;
          }
          await createSupplierAction({
            orgId: supplierOrgId,
            name: supplierName,
            contactName: supplierContactName,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          triggerNotification(true, 'Supplier created.');
        }
        setIsSupplierModalOpen(false);
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to save supplier.');
      }
    });
  };

  const handleDeleteSupplier = (id: string) => {
    if (!confirm('Delete this supplier? This will unlink it from any inventory records.')) return;
    startTransition(async () => {
      try {
        await deleteSupplierAction(id);
        triggerNotification(true, 'Supplier deleted.');
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to delete supplier.');
      }
    });
  };

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
      triggerNotification(false, 'Quantity must be a non-zero number.');
      return;
    }
    // For damage_loss, we negate
    const change = adjustType === 'damage_loss' ? -Math.abs(qty) : Math.abs(qty);

    startTransition(async () => {
      try {
        await adjustInventoryAction({
          inventoryId: adjustingItem.id,
          quantityChange: change,
          type: adjustType,
          reason: adjustReason,
        });
        triggerNotification(true, `Stock adjusted: ${change > 0 ? '+' : ''}${change} units.`);
        setIsAdjustModalOpen(false);
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to adjust stock.');
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
      triggerNotification(false, 'Select a product.');
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
        triggerNotification(true, 'Inventory record created.');
        setIsInitModalOpen(false);
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to create inventory.');
      }
    });
  };

  const handleUpdateOrderStatus = (orderId: string, status: 'pending' | 'fulfilled' | 'cancelled') => {
    if (status === 'cancelled' && !confirm('Cancel this order? Stock will be restored.')) return;
    startTransition(async () => {
      try {
        await updateSimulatedOrderStatusAction(orderId, status);
        triggerNotification(true, `Order status updated to "${status}".`);
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to update order.');
      }
    });
  };

  const handleSaveLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingOrg) return;
    startTransition(async () => {
      try {
        await updateOrgImsLicenseAction({
          organizationId: managingOrg.id,
          imsEnabled: licenseImsEnabled,
          imsExpiresAt: licenseImsExpiresAt || null,
          imsMultiBranchEnabled: licenseImsMultiBranchEnabled,
          imsBillingEnabled: licenseImsBillingEnabled,
        });
        triggerNotification(true, 'Organization IMS license updated successfully.');
        setIsLicenseModalOpen(false);
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to update license.');
      }
    });
  };

  const subTabConfig = [
    { key: 'stock' as const, label: 'Stock Levels', icon: '📦' },
    { key: 'suppliers' as const, label: 'Suppliers', icon: '🏭' },
    { key: 'orders' as const, label: 'Orders', icon: '🛒' },
    { key: 'audit' as const, label: 'Movement Log', icon: '📋' },
    { key: 'licenses' as const, label: 'Licenses & Limits', icon: '👑' },
  ];

  const movementTypeLabels: Record<string, string> = {
    restock: '📥 Restock',
    sale_depletion: '📤 Sale',
    manual_adjustment: '🔧 Adjustment',
    damage_loss: '⚠️ Damage/Loss',
    order_cancellation: '↩️ Cancellation',
  };

  return (
    <div className="space-y-4">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tracked Products', val: totalItems, icon: '📦', accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Total Units', val: totalUnits, icon: '📊', accent: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
          { label: 'Low Stock', val: lowStockCount, icon: '⚠️', accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Out of Stock', val: outOfStockCount, icon: '🚫', accent: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-zinc-200/80 rounded-xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs text-zinc-400 font-medium">{card.label}</span>
              <span className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center text-base`}>{card.icon}</span>
            </div>
            <span className={`text-2xl sm:text-3xl font-black block ${card.accent}`}>{card.val.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* ── Sub-tab Navigation ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {subTabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
              subTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── STOCK LEVELS ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === 'stock' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 shadow-sm">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                  <span className="hidden sm:inline">Init Stock</span>
                  <span className="sm:hidden">+</span>
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          {(stockSearch || stockFilter !== 'all') && (
            <p className="text-xs text-zinc-400 font-mono px-1">
              Showing {filteredStock.length} of {totalItems} items
            </p>
          )}

          {/* Stock Table */}
          <div className="bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
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
                    <tr><td colSpan={8} className="py-12 text-center text-zinc-400 font-mono text-sm">No inventory records found.</td></tr>
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
                        <p className="text-[10px] text-zinc-400 font-mono">{item.sku || 'No SKU'} · {item.binLocation || 'No location'}</p>
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
                <div className="py-12 text-center text-zinc-400 text-xs font-mono">No inventory records found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── SUPPLIERS ────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === 'suppliers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Supplier Directory</h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5 hidden sm:block">{suppliers.length} suppliers registered</p>
            </div>
            <button
              onClick={openAddSupplier}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-[0.97] whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
              Add Supplier
            </button>
          </div>

          {/* Suppliers Grid */}
          {suppliers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl dark:border-zinc-800">
              <div className="text-5xl mb-4">🏭</div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm font-semibold">No suppliers registered yet</p>
              <p className="text-zinc-400 text-xs mt-1.5">Add your first supplier to link with inventory records.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suppliers.map((s) => (
                <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.name}</h3>
                      <p className="text-[10px] text-zinc-400 font-mono">Org: {s.orgId}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditSupplier(s)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer" title="Edit">
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer" title="Delete">
                        <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {s.contactName && <p>👤 {s.contactName}</p>}
                    {s.email && <p>✉️ {s.email}</p>}
                    {s.phone && <p>📞 {s.phone}</p>}
                    {s.address && <p>📍 {s.address}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── ORDERS ───────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === 'orders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Simulated Orders</h2>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              {(['all', 'pending', 'pending_payment', 'payment_submitted', 'fulfilled', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setOrderStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    orderStatusFilter === f
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {f === 'all'
                    ? 'All'
                    : f === 'pending_payment'
                      ? 'Awaiting Pay'
                      : f === 'payment_submitted'
                        ? 'Slip Review'
                        : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl dark:border-zinc-800">
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm font-semibold">No orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const checkoutDetails = describeOrderCheckout(order, checkoutOptionsCatalog);
                return (
                <div key={order.id} className="bg-white border border-zinc-200 rounded-xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{order.customerEmail}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                          {checkoutDetails.fulfillment}
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
                          {checkoutDetails.payment}
                        </span>
                        {checkoutDetails.pickup && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            Pickup: {checkoutDetails.pickup}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">${(getOrderDisplayTotals(order).grandTotal / 100).toFixed(2)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        order.status === 'cancelled' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                        order.status === 'payment_submitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                        order.status === 'pending_payment' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        {formatOrderStatusLabel(order.status).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mb-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1 text-xs">
                        <span className="text-zinc-600 dark:text-zinc-300">{item.productName} × {item.quantity}</span>
                        <span className="font-mono text-zinc-500">${(item.unitPrice * item.quantity / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.paymentSlipUrl && (
                    <div className="mb-3">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Payment slip</p>
                      <a
                        href={order.paymentSlipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block w-full max-w-[220px] aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                      >
                        <Image
                          src={order.paymentSlipUrl}
                          alt="Customer payment slip"
                          fill
                          className="object-contain"
                          sizes="220px"
                        />
                      </a>
                    </div>
                  )}

                  {/* Status actions */}
                  {isActiveSimulatedOrder(order.status) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'fulfilled')}
                        disabled={isPending}
                        className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✓ Fulfill
                      </button>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                        disabled={isPending}
                        className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MOVEMENT LOG ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Inventory Movement Log</h2>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl overflow-x-auto scrollbar-hide">
              {['all', 'restock', 'sale_depletion', 'manual_adjustment', 'damage_loss', 'order_cancellation'].map((f) => (
                <button
                  key={f}
                  onClick={() => setMovementTypeFilter(f)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    movementTypeFilter === f
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {f === 'all' ? 'All' : movementTypeLabels[f] || f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Change</th>
                    <th className="py-2.5 px-4">Before → After</th>
                    <th className="py-2.5 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-200">{m.productName || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px]">{movementTypeLabels[m.type] || m.type}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={m.quantityChanged > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.quantityChanged > 0 ? '+' : ''}{m.quantityChanged}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500">{m.previousQuantity} → {m.newQuantity}</td>
                      <td className="py-3 px-4 text-zinc-500 max-w-[200px] truncate">{m.reason || '—'}</td>
                    </tr>
                  ))}
                  {filteredMovements.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-zinc-400 font-mono text-sm">No movements recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── LICENSES & LIMITS ─────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === 'licenses' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">IMS License Management</h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Control premium feature flags and access limits per organization</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Organization</th>
                    <th className="py-2.5 px-4">IMS Status</th>
                    <th className="py-2.5 px-4">Expires At</th>
                    <th className="py-2.5 px-4">Multi-Branch</th>
                    <th className="py-2.5 px-4">POS Billing</th>
                    <th className="py-2.5 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {organizations.map((org) => {
                    const imsEnabled = org.publicMetadata?.ims_enabled === true;
                    const imsExpiresAt = org.publicMetadata?.ims_expires_at || null;
                    const multiBranchEnabled = org.publicMetadata?.ims_multi_branch_enabled === true;
                    const billingEnabled = org.publicMetadata?.ims_billing_enabled === true;

                    let isExpired = false;
                    if (imsExpiresAt) {
                      isExpired = new Date(imsExpiresAt).getTime() < now;
                    }

                    return (
                      <tr key={org.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {org.imageUrl && (
                              <img src={org.imageUrl} alt={org.name} className="w-6 h-6 rounded-full" />
                            )}
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-250">{org.name}</p>
                              <p className="text-[9px] text-zinc-400 font-mono">ID: {org.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {imsEnabled ? (
                            isExpired ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">EXPIRED</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">ACTIVE</span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-150 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">INACTIVE</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-550">
                          {imsExpiresAt ? new Date(imsExpiresAt).toLocaleDateString() : 'Lifetime Access'}
                        </td>
                        <td className="py-3 px-4">
                          {multiBranchEnabled ? (
                            <span className="text-emerald-600">✓ Unlocked</span>
                          ) : (
                            <span className="text-zinc-400">— Locked</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {billingEnabled ? (
                            <span className="text-emerald-600">✓ Unlocked</span>
                          ) : (
                            <span className="text-zinc-400">— Locked</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setManagingOrg(org);
                              setLicenseImsEnabled(imsEnabled);
                              setLicenseImsExpiresAt(imsExpiresAt ? new Date(imsExpiresAt).toISOString().split('T')[0] : '');
                              setLicenseImsMultiBranchEnabled(multiBranchEnabled);
                              setLicenseImsBillingEnabled(billingEnabled);
                              setIsLicenseModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {organizations.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-zinc-400 font-mono text-sm">No organizations found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

      {/* ── IMS License Modal ── */}
      {isLicenseModalOpen && managingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsLicenseModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Manage IMS License: {managingOrg.name}</h3>
              <p className="text-[10px] text-zinc-450 mt-1 font-mono">Org ID: {managingOrg.id}</p>
            </div>
            <form onSubmit={handleSaveLicense} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Enable Inventory Management (IMS)</span>
                <input
                  type="checkbox"
                  checked={licenseImsEnabled}
                  onChange={(e) => setLicenseImsEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-650"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">License Expiration Date (leave empty for lifetime access)</label>
                <input
                  type="date"
                  value={licenseImsExpiresAt}
                  onChange={(e) => setLicenseImsExpiresAt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Unlock Multi-Branch stock tracking (Tier 2)</span>
                <input
                  type="checkbox"
                  checked={licenseImsMultiBranchEnabled}
                  onChange={(e) => setLicenseImsMultiBranchEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-650"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Unlock POS Billing Register & checkout (Tier 3)</span>
                <input
                  type="checkbox"
                  checked={licenseImsBillingEnabled}
                  onChange={(e) => setLicenseImsBillingEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-650"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsLicenseModalOpen(false)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">Save License Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Adjust Stock Modal ── */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsAdjustModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Adjust Stock: {adjustingItem.productName}</h3>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">Current quantity: {adjustingItem.quantity}</p>
            </div>
            <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Type</label>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as typeof adjustType)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
                  <option value="restock">📥 Restock (add units)</option>
                  <option value="manual_adjustment">🔧 Manual Adjustment</option>
                  <option value="damage_loss">⚠️ Damage/Loss (remove units)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Quantity <span className="text-rose-500">*</span></label>
                <input type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Reason</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="e.g. New shipment received" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Supplier Modal ── */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsSupplierModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3">
              {!editingSupplier && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Organization ID <span className="text-rose-500">*</span></label>
                  <input type="text" value={supplierOrgId} onChange={(e) => setSupplierOrgId(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" placeholder="org_..." />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Name <span className="text-rose-500">*</span></label>
                <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="Acme Supplies" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Contact Name</label>
                <input type="text" value={supplierContactName} onChange={(e) => setSupplierContactName(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="John Smith" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Email</label>
                  <input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="john@acme.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Phone</label>
                  <input type="text" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="+1 555-1234" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Address</label>
                <input type="text" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="123 Supply Ave, Industry City" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">{editingSupplier ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Init Inventory Modal ── */}
      {isInitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsInitModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Initialize Inventory Tracking</h3>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">{productsWithoutInventory.length} products without inventory records</p>
            </div>
            <form onSubmit={handleInitInventory} className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Product <span className="text-rose-500">*</span></label>
                <select value={initProductId} onChange={(e) => setInitProductId(e.target.value)} required className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
                  <option value="">Select Product...</option>
                  {productsWithoutInventory.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">SKU</label>
                  <input type="text" value={initSku} onChange={(e) => setInitSku(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" placeholder="ABC-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Initial Qty</label>
                  <input type="number" min="0" value={initQty} onChange={(e) => setInitQty(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Low Stock Threshold</label>
                  <input type="number" min="0" value={initThreshold} onChange={(e) => setInitThreshold(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Bin Location</label>
                  <input type="text" value={initBin} onChange={(e) => setInitBin(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" placeholder="Shelf A3" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Supplier</label>
                <select value={initSupplierId} onChange={(e) => setInitSupplierId(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
                  <option value="">No Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsInitModalOpen(false)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
