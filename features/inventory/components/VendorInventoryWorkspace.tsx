'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getVendorInventoryData } from '@/features/inventory/vendor.actions';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/notifications';

import VendorStockTab from './vendor-tabs/VendorStockTab';
import VendorSuppliersTab from './vendor-tabs/VendorSuppliersTab';
import VendorSimulatedOrdersTab from './vendor-tabs/VendorSimulatedOrdersTab';
import VendorMovementLogsTab from './vendor-tabs/VendorMovementLogsTab';
import VendorBranchesTab from './vendor-tabs/VendorBranchesTab';

// ── Types ──
type AdvancedTab = 'stock' | 'suppliers' | 'orders' | 'movements' | 'branches';

interface Props {
  initialData: Awaited<ReturnType<typeof getVendorInventoryData>>;
  initialAdvancedTab?: AdvancedTab;
}

export default function VendorInventoryWorkspace({ initialData, initialAdvancedTab }: Props) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const { confirmAction } = useConfirm();

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  // Re-fetch helper to keep UI fully in sync
  const refreshData = () => {
    startTransition(async () => {
      try {
        const fresh = await getVendorInventoryData();
        setData(fresh);
      } catch (err) {
        triggerNotification(false, 'Failed to refresh data.');
      }
    });
  };

  // View States
  const [advancedTab, setAdvancedTab] = useState<AdvancedTab>(initialAdvancedTab ?? 'stock');

  // Branch selector (Premium multi-branch)
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlBranchId = searchParams.get('branch');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(urlBranchId || '');

  useEffect(() => {
    if (data.branches && data.branches.length > 0) {
      if (!selectedBranchId) {
        const defaultBranch = data.branches.find((b) => b.isDefault) || data.branches[0];
        setSelectedBranchId(defaultBranch.id);
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('branch', defaultBranch.id);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [data.branches, selectedBranchId, pathname, router, searchParams]);

  // --- Helpers for Stock Lookup ---
  const getProductStockInfo = (productId: string) => {
    // If multi-branch is active and a branch is selected, look up branch quantity
    if (data.premiumStatus.multiBranchActive && selectedBranchId) {
      const bInv = data.branchInventory.find(
        (bi) => bi.branchId === selectedBranchId && bi.productId === productId
      );
      return {
        qty: bInv?.quantity ?? 0,
        sku: bInv?.sku || '—',
        binLocation: bInv?.binLocation || '—',
        isBranch: true,
      };
    }
    // Otherwise return central stock
    const cInv = data.inventoryItems.find((i) => i.productId === productId);
    return {
      qty: cInv?.quantity ?? 0,
      sku: cInv?.sku || '—',
      binLocation: cInv?.binLocation || '—',
      isBranch: false,
    };
  };

  return (
    <div className="space-y-6">
      {/* ── Branch Filter ── */}
      {data.premiumStatus.multiBranchActive && (
        <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Branch Context:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                const newBranchId = e.target.value;
                setSelectedBranchId(newBranchId);
                const params = new URLSearchParams(searchParams.toString());
                params.set('branch', newBranchId);
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
              }}
              className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 font-bold focus:outline-none"
            >
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏬 {b.name} {b.isDefault ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Tabs & Tables View ── */}
      <div className="space-y-4">
        {/* Sub Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'stock', label: 'Stock Levels', icon: '📦' },
            { key: 'suppliers', label: 'Suppliers', icon: '🏭' },
            { key: 'orders', label: 'Simulated Orders', icon: '🛒' },
            { key: 'movements', label: 'Movement Logs', icon: '📋' },
            { key: 'branches', label: 'Branch Directory', icon: '🏬' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAdvancedTab(tab.key as AdvancedTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                advancedTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500'
              }`}
            >
              <span className="emoji text-sm" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        {advancedTab === 'stock' && (
          <VendorStockTab
            data={data}
            selectedBranchId={selectedBranchId}
            refreshData={refreshData}
            triggerNotification={triggerNotification}
            getProductStockInfo={getProductStockInfo}
          />
        )}
        
        {advancedTab === 'suppliers' && (
          <VendorSuppliersTab
            data={data}
            refreshData={refreshData}
            triggerNotification={triggerNotification}
            confirmAction={confirmAction}
          />
        )}
        
        {advancedTab === 'orders' && (
          <VendorSimulatedOrdersTab
            data={data}
            refreshData={refreshData}
            triggerNotification={triggerNotification}
          />
        )}
        
        {advancedTab === 'movements' && (
          <VendorMovementLogsTab
            data={data}
          />
        )}
        
        {advancedTab === 'branches' && (
          <VendorBranchesTab
            data={data}
            refreshData={refreshData}
            triggerNotification={triggerNotification}
            confirmAction={confirmAction}
          />
        )}
      </div>
    </div>
  );
}
