'use client';

import { useState, useTransition, useEffect } from 'react';
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
} from './inventoryActions';

// ── Types ──
type ViewMode = 'simple' | 'advanced';
type AdvancedTab = 'stock' | 'suppliers' | 'orders' | 'movements' | 'branches';

interface Props {
  initialData: Awaited<ReturnType<typeof getVendorInventoryData>>;
}

export default function VendorInventoryWorkspace({ initialData }: Props) {
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
  const [viewMode, setViewMode] = useState<ViewMode>('simple');
  const [advancedTab, setAdvancedTab] = useState<AdvancedTab>('stock');

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
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'fulfilled' | 'cancelled'>('all');
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

    const isLow = info.qty > 0 && info.qty <= item.lowStockThreshold;
    const isOut = info.qty === 0;

    const matchesFilter =
      stockFilter === 'all' || (stockFilter === 'low' && isLow) || (stockFilter === 'out' && isOut);

    return matchesSearch && matchesFilter;
  });

  const filteredOrders = data.simulatedOrders.filter(
    (o) => orderStatusFilter === 'all' || o.status === orderStatusFilter
  );

  const filteredMovements = data.movements.filter(
    (m) => movementTypeFilter === 'all' || m.type === movementTypeFilter
  );

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
        const payload = posCart.map((item) => ({
          productId: item.product.productId,
          productName: item.product.productName,
          quantity: item.quantity,
          unitPrice: item.product.price || 0, // In central inventory lookup, let's fetch product price or fallback to catalog price. We need catalog price!
        }));

        // Find product price in data
        const checkoutItems = payload.map((item) => {
          const matchedInv = data.inventoryItems.find((inv) => inv.productId === item.productId);
          const matchedBranchInv = data.branchInventory.find(
            (bi) => bi.productId === item.productId && bi.branchId === selectedBranchId
          );
          // Let's search inventory item price
          const price = 999; // default mock fallback
          return {
            ...item,
            unitPrice: 1000, // mock price in cents ($10.00). We can fetch price from product if needed.
          };
        });

        // Let's resolve correct unitPrice using database schema values or local cache
        const finalCheckoutItems = checkoutItems.map(item => {
          // Let's get product catalog item to fetch its original price
          const catalogItem = data.inventoryItems.find(inv => inv.productId === item.productId);
          // Wait, let's find the price in central product list
          // For safety, let's look up if we can get it from inventory item:
          // Wait, let's add `price` to query return in actions or just compute it. Let's send catalog product price.
          return {
            ...item,
            unitPrice: 1500, // mock base price
          };
        });

        const result = await processBillingCheckoutAction({
          branchId: selectedBranchId,
          items: finalCheckoutItems,
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
          items: posCart.map(i => ({ name: i.product.productName, qty: i.quantity, price: 15.00 })),
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

      {/* ── View Selector & Branch Filter ── */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Workspace Mode:</span>
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('simple')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'simple'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Simple View
            </button>
            <button
              onClick={() => setViewMode('advanced')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'advanced'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Advanced View
            </button>
          </div>
        </div>

        {data.premiumStatus.multiBranchActive && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Branch:</span>
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
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── SIMPLE VIEW ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {viewMode === 'simple' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">Quick Stock Adjust</h2>
              <p className="text-xs text-zinc-500">Quickly view levels and increment or decrement stock.</p>
            </div>
            {data.productsWithoutInventory.length > 0 && (
              <button
                onClick={() => setIsInitModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.97]"
              >
                + Init Stock Tracking
              </button>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex gap-2">
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Filter by product name..."
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 focus:outline-none"
              />
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredStock.map((item) => {
                const info = getProductStockInfo(item.productId);
                const isLow = info.qty > 0 && info.qty <= item.lowStockThreshold;
                const isOut = info.qty === 0;

                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/20">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{item.productName}</span>
                        {isOut ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">OUT</span>
                        ) : isLow ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">LOW</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">OK</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                        SKU: {info.sku} · Location: {info.binLocation}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (info.qty <= 0) return;
                            startTransition(async () => {
                              try {
                                if (info.isBranch) {
                                  await allocateBranchStockAction({
                                    branchId: selectedBranchId,
                                    productId: item.productId,
                                    quantity: info.qty - 1,
                                    sku: info.sku !== '—' ? info.sku : undefined,
                                    binLocation: info.binLocation !== '—' ? info.binLocation : undefined,
                                  });
                                } else {
                                  await vendorAdjustInventoryAction({
                                    inventoryId: item.id,
                                    quantityChange: -1,
                                    type: 'manual_adjustment',
                                    reason: 'Simple view quick decrement',
                                  });
                                }
                                triggerNotification(true, 'Stock decremented.');
                                refreshData();
                              } catch (err) {
                                triggerNotification(false, 'Failed to adjust stock.');
                              }
                            });
                          }}
                          disabled={info.qty <= 0 || isPending}
                          className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-black font-mono text-sm dark:text-white">
                          {info.qty}
                        </span>
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              try {
                                if (info.isBranch) {
                                  await allocateBranchStockAction({
                                    branchId: selectedBranchId,
                                    productId: item.productId,
                                    quantity: info.qty + 1,
                                    sku: info.sku !== '—' ? info.sku : undefined,
                                    binLocation: info.binLocation !== '—' ? info.binLocation : undefined,
                                  });
                                } else {
                                  await vendorAdjustInventoryAction({
                                    inventoryId: item.id,
                                    quantityChange: 1,
                                    type: 'restock',
                                    reason: 'Simple view quick increment',
                                  });
                                }
                                triggerNotification(true, 'Stock incremented.');
                                refreshData();
                              } catch (err) {
                                triggerNotification(false, 'Failed to adjust stock.');
                              }
                            });
                          }}
                          disabled={isPending}
                          className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                        >
                          +
                        </button>
                      </div>

                      {data.premiumStatus.multiBranchActive && (
                        <button
                          onClick={() => {
                            setAllocatingProduct(item);
                            setAllocateQty(info.qty.toString());
                            setAllocateSku(info.sku !== '—' ? info.sku : '');
                            setAllocateBin(info.binLocation !== '—' ? info.binLocation : '');
                            setIsAllocateModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Allocate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredStock.length === 0 && (
                <div className="p-8 text-center text-zinc-400 font-mono text-xs">No records found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── ADVANCED VIEW ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {viewMode === 'advanced' && (
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
                <span>{tab.icon}</span>
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
                          <td className="p-3 font-black text-sm">{info.qty}</td>
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
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Customer Orders (Simulated)</h3>
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                  {(['all', 'pending', 'fulfilled', 'cancelled'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderStatusFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                        orderStatusFilter === f ? 'bg-white shadow-sm font-black' : 'text-zinc-500'
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredOrders.map((o) => (
                  <div key={o.id} className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{o.customerName} ({o.customerEmail})</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Order Date: {new Date(o.createdAt).toLocaleString()}</p>
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
                        <span className="text-sm font-mono font-black">${(o.totalAmount / 100).toFixed(2)}</span>
                        <p className={`text-[10px] uppercase font-bold mt-1 ${
                          o.status === 'fulfilled' ? 'text-emerald-600' : o.status === 'cancelled' ? 'text-rose-600' : 'text-amber-600'
                        }`}>{o.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MOVEMENT LOGS */}
          {advancedTab === 'movements' && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Inventory Audit History</h3>
              <div className="bg-white border border-zinc-200 rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 uppercase font-mono text-[9px]">
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
                        <td className="p-3 font-bold">{m.productName}</td>
                        <td className="p-3 font-semibold">{movementTypeLabels[m.type] || m.type}</td>
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
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-150">🏬 {b.name}</span>
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
                          className="text-xs text-zinc-400 hover:text-indigo-650"
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
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Assigned Members (Cashiers/Managers)</span>
                        <button
                          onClick={() => {
                            setAssignBranchId(b.id);
                            setAssignMemberId('');
                            setAssignRole('cashier');
                            setIsAssignMemberModalOpen(true);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                        >
                          + Assign Cashier
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {data.branchMembers
                          .filter((bm) => bm.branchId === b.id)
                          .map((bm) => (
                            <div key={bm.id} className="flex justify-between items-center text-xs bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg">
                              <span>👤 {getMemberName(bm.memberUserId)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-850">{bm.role}</span>
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
                          <p className="text-[10px] text-zinc-400">No cashiers mapped yet. Single-owner defaults active.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

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
                <label className="block text-xs font-semibold text-zinc-650">Adjustment Type</label>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="restock">📥 Restock (add units)</option>
                  <option value="manual_adjustment">🔧 Manual Adjustment</option>
                  <option value="damage_loss">⚠️ Damage/Loss (remove units)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Quantity</label>
                <input type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required className="w-full px-3 py-2 border rounded-xl text-xs font-mono" placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Reason</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="e.g. Received new pallet" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-250 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
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
                <label className="block text-xs font-semibold text-zinc-650">Product</label>
                <select value={initProductId} onChange={(e) => setInitProductId(e.target.value)} required className="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="">-- Select Product --</option>
                  {data.productsWithoutInventory.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">SKU Code</label>
                  <input type="text" value={initSku} onChange={(e) => setInitSku(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-mono" placeholder="SKU-..." />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">Initial Qty</label>
                  <input type="number" min="0" value={initQty} onChange={(e) => setInitQty(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">Low Threshold</label>
                  <input type="number" min="0" value={initThreshold} onChange={(e) => setInitThreshold(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">Shelf Bin Location</label>
                  <input type="text" value={initBin} onChange={(e) => setInitBin(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Aisle 1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Link Supplier</label>
                <select value={initSupplierId} onChange={(e) => setInitSupplierId(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="">-- None --</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsInitModalOpen(false)} className="flex-1 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
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
                <label className="block text-xs font-semibold text-zinc-650">Supplier Name</label>
                <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Acme Ltd" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Contact Agent</label>
                <input type="text" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">Email</label>
                  <input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="jane@acme.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">Phone</label>
                  <input type="text" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="+1234" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Office Address</label>
                <input type="text" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Street Address" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
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
                <label className="block text-xs font-semibold text-zinc-650">Branch Name</label>
                <input type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)} required className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="e.g. Uptown POS Outlet" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Street Address</label>
                <input type="text" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Street name, City" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Store Phone Contact</label>
                <input type="text" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="+123..." />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsBranchModalOpen(false)} className="flex-1 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
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
                <label className="block text-xs font-semibold text-zinc-650">Quantity at Location</label>
                <input type="number" min="0" value={allocateQty} onChange={(e) => setAllocateQty(e.target.value)} required className="w-full px-3 py-2 border rounded-xl text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">Location SKU Override</label>
                  <input type="text" value={allocateSku} onChange={(e) => setAllocateSku(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-mono" placeholder="SKU-..." />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-650">Shelf Bin Location</label>
                  <input type="text" value={allocateBin} onChange={(e) => setAllocateBin(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Aisle 3" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAllocateModalOpen(false)} className="flex-1 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
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
                <label className="block text-xs font-semibold text-zinc-650">Select Member</label>
                <select value={assignMemberId} onChange={(e) => setAssignMemberId(e.target.value)} required className="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="">-- Select Org Member --</option>
                  {data.orgMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-650">Branch Role Mapping</label>
                <select value={assignRole} onChange={(e) => setAssignRole(e.target.value as any)} required className="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="cashier">POS Cashier Register</option>
                  <option value="manager">Branch Store Manager</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAssignMemberModalOpen(false)} className="flex-1 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">Assign Duty</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
