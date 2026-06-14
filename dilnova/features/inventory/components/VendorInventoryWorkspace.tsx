'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  getVendorInventoryData,
  vendorAdjustInventoryAction,
  vendorCreateSupplierAction,
  vendorUpdateSupplierAction,
  vendorDeleteSupplierAction,
  vendorInitInventoryAction,
  createBranchAction,
  updateBranchAction,
  deleteBranchAction,
  allocateBranchStockAction,
  assignBranchMemberAction,
  removeBranchMemberAction,
  processBillingCheckoutAction,
} from '@/features/inventory/vendor.actions';
import { formatOrderStatusLabel, matchesOrderStatusFilter } from '@/features/orders/status';
import { isCodPayment } from '@/features/orders/payment.rules';
import { isBankTransferPayment } from '@/utils/bankTransfer';
import { describeOrderCheckout } from '@/utils/checkoutOptionsShared';
import { getOrderDisplayTotals } from '@/utils/checkoutTotals';
import { VendorOrderPaymentPanel } from '@/features/orders/components/OrderPaymentPanels';
import {
  cancelVendorOrderAction,
  rejectPaymentSlipAction,
  verifyOrderPaymentAction,
} from '@/features/orders/vendor.actions';

// ── Types ──
type AdvancedTab = 'stock' | 'suppliers' | 'orders' | 'movements' | 'branches';

interface Props {
  initialData: Awaited<ReturnType<typeof getVendorInventoryData>>;
  initialAdvancedTab?: AdvancedTab;
}

export default function VendorInventoryWorkspace({ initialData, initialAdvancedTab }: Props) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState<{ success: boolean; text: string } | null>(null);

  const triggerNotification = (success: boolean, text: string) => {
    setToast({ success, text });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  useEffect(() => {
    if (data.branches && data.branches.length > 0) {
      const defaultBranch = data.branches.find((b) => b.isDefault) || data.branches[0];
      requestAnimationFrame(() => {
        setSelectedBranchId(defaultBranch.id);
      });
    }
  }, [data.branches]);

  // --- Filtering States ---
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    'all' | 'pending' | 'pending_payment' | 'payment_submitted' | 'fulfilled' | 'cancelled'
  >('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');

  // --- Modals State ---
  // Adjust Stock Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<'restock' | 'manual_adjustment' | 'damage_loss'>('restock');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Init Stock Modal
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [initProductId, setInitProductId] = useState('');
  const [initSku, setInitSku] = useState('');
  const [initQty, setInitQty] = useState('0');
  const [initThreshold, setInitThreshold] = useState('5');
  const [initBin, setInitBin] = useState('');
  const [initSupplierId, setInitSupplierId] = useState('');

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  // Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // Branch Allocation Modal
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocatingProduct, setAllocatingProduct] = useState<any>(null);
  const [allocateQty, setAllocateQty] = useState('');
  const [allocateSku, setAllocateSku] = useState('');
  const [allocateBin, setAllocateBin] = useState('');

  // Assign Cashier Modal
  const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignMemberId, setAssignMemberId] = useState('');
  const [assignRole, setAssignRole] = useState<'cashier' | 'manager'>('cashier');

  // --- POS Register Cart State ---
  const [posCart, setPosCart] = useState<{ product: any; quantity: number }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posNotes, setPosNotes] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash');
  const [posReceiptToPrint, setPosReceiptToPrint] = useState<any>(null);

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

  // --- Filters ---
  const filteredStock = data.inventoryItems.filter((item) => {
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

  const orderLifecycleStats = {
    total: data.simulatedOrders.length,
    awaitingSlip: data.simulatedOrders.filter(
      (o) => isBankTransferPayment(o.paymentMethod) && o.status === 'pending_payment'
    ).length,
    slipReview: data.simulatedOrders.filter((o) => o.status === 'payment_submitted').length,
    bankFulfilled: data.simulatedOrders.filter(
      (o) => o.status === 'fulfilled' && isBankTransferPayment(o.paymentMethod)
    ).length,
    codFulfilled: data.simulatedOrders.filter(
      (o) => o.status === 'fulfilled' && isCodPayment(o.paymentMethod)
    ).length,
    cancelled: data.simulatedOrders.filter((o) => o.status === 'cancelled').length,
  };

  const filteredOrders = data.simulatedOrders.filter(
    (o) => matchesOrderStatusFilter(o.status, orderStatusFilter)
  );

  const filteredMovements = data.movements.filter(
    (m) => movementTypeFilter === 'all' || m.type === movementTypeFilter
  );

  const handleVerifyOrderPayment = (orderId: string) => {
    startTransition(async () => {
      try {
        await verifyOrderPaymentAction(orderId);
        triggerNotification(true, 'Order payment verified.');
        refreshData();
      } catch (error) {
        triggerNotification(false, error instanceof Error ? error.message : 'Verification failed.');
      }
    });
  };

  const handleRejectPaymentSlip = (orderId: string) => {
    startTransition(async () => {
      try {
        await rejectPaymentSlipAction(orderId);
        triggerNotification(true, 'Payment slip rejected. Customer can upload again.');
        refreshData();
      } catch (error) {
        triggerNotification(false, error instanceof Error ? error.message : 'Rejection failed.');
      }
    });
  };

  const handleCancelVendorOrder = (orderId: string) => {
    startTransition(async () => {
      try {
        await cancelVendorOrderAction(orderId);
        triggerNotification(true, 'Order cancelled.');
        refreshData();
      } catch (error) {
        triggerNotification(false, error instanceof Error ? error.message : 'Cancellation failed.');
      }
    });
  };

  // --- Handlers ---
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingSupplier) {
          await vendorUpdateSupplierAction({
            id: editingSupplier.id,
            name: supplierName,
            contactName: supplierContact,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          triggerNotification(true, 'Supplier updated.');
        } else {
          await vendorCreateSupplierAction({
            name: supplierName,
            contactName: supplierContact,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          triggerNotification(true, 'Supplier added.');
        }
        setIsSupplierModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Action failed.');
      }
    });
  };

  const handleDeleteSupplier = (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    startTransition(async () => {
      try {
        await vendorDeleteSupplierAction(id);
        triggerNotification(true, 'Supplier deleted.');
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Action failed.');
      }
    });
  };

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

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingBranch) {
          await updateBranchAction({
            id: editingBranch.id,
            name: branchName,
            address: branchAddress,
            phone: branchPhone,
          });
          triggerNotification(true, 'Branch updated.');
        } else {
          await createBranchAction({
            name: branchName,
            address: branchAddress,
            phone: branchPhone,
          });
          triggerNotification(true, 'Branch created.');
        }
        setIsBranchModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Action failed.');
      }
    });
  };

  const handleDeleteBranch = (id: string) => {
    if (!confirm('Are you sure you want to delete this branch? All branch stock records will be removed.')) return;
    startTransition(async () => {
      try {
        await deleteBranchAction(id);
        triggerNotification(true, 'Branch deleted.');
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Action failed.');
      }
    });
  };

  const handleAllocateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingProduct || !selectedBranchId) return;
    const qty = parseInt(allocateQty, 10);
    if (isNaN(qty) || qty < 0) {
      triggerNotification(false, 'Please enter a valid stock level.');
      return;
    }
    startTransition(async () => {
      try {
        await allocateBranchStockAction({
          branchId: selectedBranchId,
          productId: allocatingProduct.productId,
          quantity: qty,
          sku: allocateSku || undefined,
          binLocation: allocateBin || undefined,
        });
        triggerNotification(true, 'Branch stock allocated.');
        setIsAllocateModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to allocate stock.');
      }
    });
  };

  const handleAssignMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBranchId || !assignMemberId) {
      triggerNotification(false, 'Branch and member are required.');
      return;
    }
    startTransition(async () => {
      try {
        await assignBranchMemberAction({
          branchId: assignBranchId,
          memberUserId: assignMemberId,
          role: assignRole,
        });
        triggerNotification(true, 'Member assigned to branch.');
        setIsAssignMemberModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to assign.');
      }
    });
  };

  const handleRemoveMember = (id: string) => {
    if (!confirm('Remove this member assignment?')) return;
    startTransition(async () => {
      try {
        await removeBranchMemberAction(id);
        triggerNotification(true, 'Assignment removed.');
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to remove.');
      }
    });
  };

  const addToPOSCart = (product: any) => {
    const stock = getProductStockInfo(product.productId);
    const existing = posCart.find((item) => item.product.productId === product.productId);
    const currentQtyInCart = existing?.quantity ?? 0;

    if (stock.qty <= currentQtyInCart) {
      triggerNotification(false, `Cannot add more. Only ${stock.qty} units available at this branch.`);
      return;
    }

    if (existing) {
      setPosCart(
        posCart.map((item) =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setPosCart([...posCart, { product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId: string, qty: number) => {
    const stock = getProductStockInfo(productId);
    if (qty > stock.qty) {
      triggerNotification(false, `Only ${stock.qty} units available.`);
      return;
    }
    if (qty <= 0) {
      setPosCart(posCart.filter((item) => item.product.productId !== productId));
    } else {
      setPosCart(
        posCart.map((item) =>
          item.product.productId === productId ? { ...item, quantity: qty } : item
        )
      );
    }
  };

  const handlePOSCheckout = () => {
    if (posCart.length === 0) return;
    if (!selectedBranchId) {
      triggerNotification(false, 'Select a branch register first.');
      return;
    }

    startTransition(async () => {
      try {
        const checkoutItems = posCart.map((item) => ({
          productId: item.product.productId,
          productName: item.product.productName,
          quantity: item.quantity,
          unitPrice: item.product.productPrice,
        }));

        const result = await processBillingCheckoutAction({
          branchId: selectedBranchId,
          items: checkoutItems,
          paymentMethod: posPaymentMethod,
          customerName: posCustomerName,
          notes: posNotes,
        });

        triggerNotification(true, `POS receipt processed. Order Total: $${(result.totalAmount / 100).toFixed(2)}`);
        
        // Save receipt info for print view
        setPosReceiptToPrint({
          id: result.receiptId,
          branchName: data.branches.find(b => b.id === selectedBranchId)?.name || 'Branch Register',
          cashier: 'Cashier Register',
          items: posCart.map((i) => ({
            name: i.product.productName,
            qty: i.quantity,
            price: i.product.productPrice / 100,
          })),
          total: result.totalAmount / 100,
          paymentMethod: posPaymentMethod,
          customerName: posCustomerName,
          date: new Date(),
        });

        setPosCart([]);
        setPosCustomerName('');
        setPosNotes('');
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'POS checkout failed.');
      }
    });
  };

  const getBranchName = (branchId: string) => {
    return data.branches.find((b) => b.id === branchId)?.name || 'Unknown Branch';
  };

  const getMemberName = (userId: string) => {
    return data.orgMembers.find((m) => m.userId === userId)?.name || userId;
  };

  const getMemberEmail = (userId: string) => {
    return data.orgMembers.find((m) => m.userId === userId)?.email || '';
  };

  const movementTypeLabels: Record<string, string> = {
    restock: '📥 Restock',
    sale_depletion: '📤 Sale',
    manual_adjustment: '🔧 Adjustment',
    damage_loss: '⚠️ Damage/Loss',
    order_cancellation: '↩️ Cancellation',
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-[60] p-3.5 rounded-xl text-xs font-semibold border shadow-xl backdrop-blur-lg transition-all duration-300 ${
            toast.success
              ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-400 dark:border-emerald-900/50'
              : 'bg-rose-50/95 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-400 dark:border-rose-900/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 p-1 cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* ── Branch Filter ── */}
      {data.premiumStatus.multiBranchActive && (
        <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Branch Context:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
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
              ...(data.premiumStatus.multiBranchActive ? [{ key: 'branches', label: 'Branch Directory', icon: '🏬' }] : []),
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

          {/* TAB 1: STOCK LEVELS */}
          {advancedTab === 'stock' && (
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
                    {filteredStock.map((item) => {
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
            </div>
          )}

          {/* TAB 2: SUPPLIERS */}
          {advancedTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Supplier Directory</h3>
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setSupplierName('');
                    setSupplierContact('');
                    setSupplierEmail('');
                    setSupplierPhone('');
                    setSupplierAddress('');
                    setIsSupplierModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  + Add Supplier
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.suppliers.map((s) => (
                  <div key={s.id} className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-2.5">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{s.name}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingSupplier(s);
                            setSupplierName(s.name);
                            setSupplierContact(s.contactName || '');
                            setSupplierEmail(s.email || '');
                            setSupplierPhone(s.phone || '');
                            setSupplierAddress(s.address || '');
                            setIsSupplierModalOpen(true);
                          }}
                          className="text-xs text-zinc-400 hover:text-indigo-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(s.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 ml-2"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 space-y-1">
                      {s.contactName && <p>👤 {s.contactName}</p>}
                      {s.email && <p>✉️ {s.email}</p>}
                      {s.phone && <p>📞 {s.phone}</p>}
                      {s.address && <p>📍 {s.address}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SIMULATED ORDERS */}
          {advancedTab === 'orders' && (
            <div className="space-y-4">
              <div className="border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Phase 5 — Online Order Lifecycle Checklist</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Verify bank transfer slips, fulfill COD orders, and cancel when needed. Place test orders as a signed-in customer first.
                    </p>
                  </div>
                  <span
                    className={`self-start text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      orderLifecycleStats.bankFulfilled > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                    }`}
                  >
                    {orderLifecycleStats.bankFulfilled > 0 ? 'Bank flow tested' : 'Place test orders'}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600">✓</span>
                    Premium IMS license enabled — orders appear on this tab
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={orderLifecycleStats.total > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                      {orderLifecycleStats.total > 0 ? '✓' : '○'}
                    </span>
                    Customer order received ({orderLifecycleStats.total}) — checkout at{' '}
                    <Link href="/cart" className="text-purple-700 dark:text-purple-400 hover:underline">
                      /cart
                    </Link>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={orderLifecycleStats.awaitingSlip > 0 || orderLifecycleStats.slipReview > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                      {orderLifecycleStats.awaitingSlip > 0 || orderLifecycleStats.slipReview > 0 ? '✓' : '○'}
                    </span>
                    Bank transfer order in pipeline — awaiting slip ({orderLifecycleStats.awaitingSlip}) or slip review ({orderLifecycleStats.slipReview})
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={orderLifecycleStats.bankFulfilled > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                      {orderLifecycleStats.bankFulfilled > 0 ? '✓' : '○'}
                    </span>
                    Bank transfer verified → fulfilled ({orderLifecycleStats.bankFulfilled}) — use <strong>Verify Payment</strong> on Slip Review filter
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={orderLifecycleStats.codFulfilled > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                      {orderLifecycleStats.codFulfilled > 0 ? '✓' : '○'}
                    </span>
                    COD order fulfilled ({orderLifecycleStats.codFulfilled}) <span className="text-zinc-400">(skip if COD disabled)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={orderLifecycleStats.cancelled > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                      {orderLifecycleStats.cancelled > 0 ? '✓' : '○'}
                    </span>
                    Cancel flow tested ({orderLifecycleStats.cancelled}) <span className="text-zinc-400">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400">○</span>
                    Reject slip: customer returns to <strong>Pending Payment</strong> and can re-upload on{' '}
                    <Link href="/customer?tab=orders" className="text-purple-700 dark:text-purple-400 hover:underline">
                      /customer
                    </Link>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400">○</span>
                    Member RBAC: <code className="font-mono text-[10px]">org:member</code> cannot verify, reject, or cancel orders
                  </li>
                </ul>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Customer Orders (Simulated)</h3>
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                  {(['all', 'pending', 'pending_payment', 'payment_submitted', 'fulfilled', 'cancelled'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderStatusFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                        orderStatusFilter === f ? 'bg-white shadow-sm font-black' : 'text-zinc-500'
                      }`}
                    >
                      {f === 'pending_payment'
                        ? 'Awaiting Pay'
                        : f === 'payment_submitted'
                          ? 'Slip Review'
                          : f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredOrders.map((o) => {
                  const checkoutDetails = describeOrderCheckout(o, data.checkoutOptionsCatalog);
                  return (
                  <div key={o.id} className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{o.customerName} ({o.customerEmail})</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Order Date: {new Date(o.createdAt).toLocaleString()}</p>
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
                      <div className="mt-2 pl-2 border-l-2 border-zinc-200 space-y-1">
                        {o.items.map((item: any) => (
                          <p key={item.id} className="text-xs text-zinc-600 dark:text-zinc-400">
                            • {item.productName} (x{item.quantity}) — ${(item.unitPrice / 100).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-between items-end">
                      <div>
                        <span className="text-sm font-mono font-black text-zinc-900 dark:text-zinc-100">${(getOrderDisplayTotals(o).grandTotal / 100).toFixed(2)}</span>
                        <p className={`text-[10px] uppercase font-bold mt-1 ${
                          o.status === 'fulfilled' ? 'text-emerald-600' :
                          o.status === 'cancelled' ? 'text-rose-600' :
                          o.status === 'payment_submitted' ? 'text-blue-600' :
                          o.status === 'pending_payment' ? 'text-orange-600' :
                          'text-amber-600'
                        }`}>{formatOrderStatusLabel(o.status)}</p>
                      </div>
                      <VendorOrderPaymentPanel
                        order={{
                          id: o.id,
                          paymentMethod: o.paymentMethod,
                          status: o.status,
                          paymentSlipUrl: o.paymentSlipUrl,
                          customerEmail: o.customerEmail,
                        }}
                        onVerify={handleVerifyOrderPayment}
                        onReject={handleRejectPaymentSlip}
                        onCancel={handleCancelVendorOrder}
                        isPending={isPending}
                      />
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MOVEMENT LOGS */}
          {advancedTab === 'movements' && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Inventory Audit History</h3>
              <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[9px]">
                      <th className="p-3">Date</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Adjusted</th>
                      <th className="p-3">Before → After</th>
                      <th className="p-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-50/20">
                        <td className="p-3 text-zinc-500 font-mono">{new Date(m.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-200">{m.productName}</td>
                        <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-200">{movementTypeLabels[m.type] || m.type}</td>
                        <td className="p-3 font-bold font-mono">
                          <span className={m.quantityChanged > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {m.quantityChanged > 0 ? '+' : ''}
                            {m.quantityChanged}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-500 font-mono">{m.previousQuantity} → {m.newQuantity}</td>
                        <td className="p-3 text-zinc-500 max-w-[200px] truncate">{m.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: BRANCH DIRECTORY */}
          {advancedTab === 'branches' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Branch Stores & Warehouses</h3>
                  <p className="text-xs text-zinc-400">Allocate separate stock capacities and map cashiers/POS registers.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingBranch(null);
                    setBranchName('');
                    setBranchAddress('');
                    setBranchPhone('');
                    setIsBranchModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  + Add Branch
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.branches.map((b) => (
                  <div key={b.id} className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">🏬 {b.name}</span>
                        {b.isDefault && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase">Default</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingBranch(b);
                            setBranchName(b.name);
                            setBranchAddress(b.address || '');
                            setBranchPhone(b.phone || '');
                            setIsBranchModalOpen(true);
                          }}
                          className="text-xs text-zinc-400 hover:text-indigo-600"
                        >
                          Edit
                        </button>
                        {!b.isDefault && (
                          <button
                            onClick={() => handleDeleteBranch(b.id)}
                            className="text-xs text-rose-500 hover:text-rose-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {b.address && <p>📍 {b.address}</p>}
                      {b.phone && <p>📞 {b.phone}</p>}
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Assigned Branch Members</span>
                        <button
                          onClick={() => {
                            setAssignBranchId(b.id);
                            setAssignMemberId('');
                            setAssignRole('cashier');
                            setIsAssignMemberModalOpen(true);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                        >
                          + Assign Member
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {data.branchMembers
                          .filter((bm) => bm.branchId === b.id)
                          .map((bm) => (
                            <div key={bm.id} className="flex justify-between items-center text-xs bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg">
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">👤 {getMemberName(bm.memberUserId)}</span>
                                {getMemberEmail(bm.memberUserId) && (
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono ml-5">
                                    {getMemberEmail(bm.memberUserId)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRemoveMember(bm.id)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        {data.branchMembers.filter((bm) => bm.branchId === b.id).length === 0 && (
                          <p className="text-[10px] text-zinc-400">No members assigned yet. Single-owner defaults active.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* ── MODALS ── */}

      {/* 1. Adjust Stock Modal */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsAdjustModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Adjust Stock: {adjustingItem.productName}</h3>
            </div>
            <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Adjustment Type</label>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none">
                  <option value="restock">📥 Restock (add units)</option>
                  <option value="manual_adjustment">🔧 Manual Adjustment</option>
                  <option value="damage_loss">⚠️ Damage/Loss (remove units)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Quantity</label>
                <input type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Reason</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="e.g. Received new pallet" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Init Stock Tracking Modal */}
      {isInitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsInitModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Initialize Stock Tracking</h3>
            </div>
            <form onSubmit={handleInitInventory} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Product</label>
                <select value={initProductId} onChange={(e) => setInitProductId(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none">
                  <option value="">-- Select Product --</option>
                  {data.productsWithoutInventory.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">SKU Code</label>
                  <input type="text" value={initSku} onChange={(e) => setInitSku(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="SKU-..." />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Initial Qty</label>
                  <input type="number" min="0" value={initQty} onChange={(e) => setInitQty(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Low Threshold</label>
                  <input type="number" min="0" value={initThreshold} onChange={(e) => setInitThreshold(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Shelf Bin Location</label>
                  <input type="text" value={initBin} onChange={(e) => setInitBin(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="Aisle 1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Link Supplier</label>
                <select value={initSupplierId} onChange={(e) => setInitSupplierId(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none">
                  <option value="">-- None --</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsInitModalOpen(false)} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">Track Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Supplier Add/Edit Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsSupplierModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Supplier Name</label>
                <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="Acme Ltd" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Contact Agent</label>
                <input type="text" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Email</label>
                  <input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="jane@acme.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Phone</label>
                  <input type="text" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="+1234" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Office Address</label>
                <input type="text" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="Street Address" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Branch Add/Edit Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsBranchModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{editingBranch ? 'Edit Branch Location' : 'Register New Branch'}</h3>
            </div>
            <form onSubmit={handleSaveBranch} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Branch Name</label>
                <input type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="e.g. Uptown POS Outlet" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Street Address</label>
                <input type="text" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="Street name, City" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Store Phone Contact</label>
                <input type="text" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="+123..." />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsBranchModalOpen(false)} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Branch Stock Allocation Modal */}
      {isAllocateModalOpen && allocatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsAllocateModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                Allocate Stock at Branch: {getBranchName(selectedBranchId)}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-1 font-mono">Product: {allocatingProduct.productName}</p>
            </div>
            <form onSubmit={handleAllocateStock} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Quantity at Location</label>
                <input type="number" min="0" value={allocateQty} onChange={(e) => setAllocateQty(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Location SKU Override</label>
                  <input type="text" value={allocateSku} onChange={(e) => setAllocateSku(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="SKU-..." />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Shelf Bin Location</label>
                  <input type="text" value={allocateBin} onChange={(e) => setAllocateBin(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none" placeholder="Aisle 3" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAllocateModalOpen(false)} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">Apply Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Assign Member Modal */}
      {isAssignMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsAssignMemberModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Assign Member/Cashier</h3>
            </div>
            <form onSubmit={handleAssignMember} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Select Member</label>
                <select value={assignMemberId} onChange={(e) => setAssignMemberId(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none">
                  <option value="">-- Select Org Member --</option>
                  {data.orgMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} {m.email ? `(${m.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAssignMemberModalOpen(false)} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">Assign Duty</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
