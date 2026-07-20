'use client';

import { useState, useEffect } from 'react';
import { type CheckoutOptionDefinition } from '@/features/organization/checkout-options.shared';

import SuperadminStockTab from './superadmin-tabs/SuperadminStockTab';
import SuperadminSuppliersTab from './superadmin-tabs/SuperadminSuppliersTab';
import SuperadminOrdersTab from './superadmin-tabs/SuperadminOrdersTab';
import SuperadminAuditTab from './superadmin-tabs/SuperadminAuditTab';

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
  paymentSlipPreviewUrl?: string | null;
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
  organizations,
}: InventoryTabProps) {
  const [subTab, setSubTab] = useState<InventorySubTab>('stock');
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    requestAnimationFrame(() => {
      setNow(Date.now());
    });
  }, []);

  // ── Stats ──
  const totalItems = inventoryItems.length;
  const lowStockCount = inventoryItems.filter((i) => i.quantity > 0 && i.quantity <= i.lowStockThreshold).length;
  const outOfStockCount = inventoryItems.filter((i) => i.quantity === 0).length;
  const totalUnits = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);

  const subTabConfig = [
    { key: 'stock' as const, label: 'Stock Levels', icon: '📦' },
    { key: 'suppliers' as const, label: 'Suppliers', icon: '🏭' },
    { key: 'orders' as const, label: 'Orders', icon: '🛒' },
    { key: 'audit' as const, label: 'Movement Log', icon: '📋' },
  ];

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

      {/* ── Tab Content ── */}
      {subTab === 'stock' && (
        <SuperadminStockTab 
          inventoryItems={inventoryItems} 
          productsWithoutInventory={productsWithoutInventory}
          suppliers={suppliers} 
        />
      )}
      
      {subTab === 'suppliers' && (
        <SuperadminSuppliersTab suppliers={suppliers} />
      )}
      
      {subTab === 'orders' && (
        <SuperadminOrdersTab 
          simulatedOrders={simulatedOrders}
          checkoutOptionsCatalog={checkoutOptionsCatalog} 
        />
      )}
      
      {subTab === 'audit' && (
        <SuperadminAuditTab movements={movements} />
      )}

    </div>
  );
}
