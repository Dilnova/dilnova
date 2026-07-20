import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { getCartCheckoutOptionsAction, syncCartPricesAction } from '@/features/cart/checkout.actions';
import { syncSelectedProductIds } from '@/features/cart/vendor-checkout';
import { BANK_TRANSFER_PAYMENT_ID } from '@/features/billing/bank-transfer';
import type { CartItem } from '@/features/cart/types';

export function useCheckoutOptionsState(
  isSignedIn: boolean,
  cartItems: CartItem[],
  syncCartPrices: (items: any[], removedIds: string[]) => void
) {
  const [fulfillmentMethod, setFulfillmentMethod] = useState('store_pickup');
  const [paymentMethod, setPaymentMethod] = useState(BANK_TRANSFER_PAYMENT_ID);
  const [pickupBranchId, setPickupBranchId] = useState('');

  const [checkoutOptions, setCheckoutOptions] = useState<{
    fulfillment: { id: string; label: string; description?: string; zeroShipping: boolean; requiresBranch: boolean }[];
    payment: { id: string; label: string; description?: string; requiresDelivery: boolean; pendingPayment?: boolean }[];
    pickupBranches: { orgId: string; branches: { id: string; name: string; address: string | null; phone: string | null }[] }[];
    vendorBankTransferByOrg: Record<string, { vendorName: string; configured: boolean }>;
    vendorCartSummary: { orgId: string; vendorName: string; subtotalCents: number; productIds: string[]; itemCount: number }[];
  }>({ fulfillment: [], payment: [], pickupBranches: [], vendorBankTransferByOrg: {}, vendorCartSummary: [] });

  const [vendorCount, setVendorCount] = useState(0);
  const [selectedCheckoutVendorOrgId, setSelectedCheckoutVendorOrgId] = useState('');
  const [requiresVendorSelection, setRequiresVendorSelection] = useState(false);
  const [selectedCheckoutProductIds, setSelectedCheckoutProductIds] = useState<string[]>([]);
  const [priceSyncNotice, setPriceSyncNotice] = useState<string | null>(null);

  const cartItemIds = cartItems.map((item) => item.id).join(',');
  const cartLinesKey = cartItems.map((item) => `${item.id}:${item.quantity}`).join(',');
  const prevCartItemIdsRef = useRef<string[]>([]);
  const prevCheckoutVendorOrgIdRef = useRef('');

  useEffect(() => {
    if (cartItems.length === 0) {
      setPriceSyncNotice(null);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      syncCartPricesAction(cartItems.map((item) => item.id)).then((result) => {
        if (cancelled || !result.success) return;

        const previousById = new Map(cartItems.map((item) => [item.id, item]));
        const priceChanged = result.items.some(
          (item) => previousById.get(item.id)?.price !== item.price
        );

        syncCartPrices(result.items, result.removedIds);

        if (result.removedIds.length > 0 && priceChanged) {
          setPriceSyncNotice('Some items were removed and prices were updated to match the catalog.');
        } else if (result.removedIds.length > 0) {
          setPriceSyncNotice('Some unavailable items were removed from your cart.');
        } else if (priceChanged) {
          setPriceSyncNotice('Cart prices were updated to match the current catalog.');
        } else {
          setPriceSyncNotice(null);
        }
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [cartItemIds, syncCartPrices, cartItems]);

  useEffect(() => {
    if (!isSignedIn) {
      setSelectedCheckoutProductIds([]);
      prevCartItemIdsRef.current = [];
      prevCheckoutVendorOrgIdRef.current = '';
      return;
    }

    const currentIds = cartItems.map((item) => item.id);
    const previousIds = prevCartItemIdsRef.current;
    prevCartItemIdsRef.current = currentIds;

    setSelectedCheckoutProductIds((prev) =>
      syncSelectedProductIds({
        previousSelection: prev,
        previousCartIds: previousIds,
        currentCartIds: currentIds,
      })
    );
  }, [cartLinesKey, isSignedIn, cartItems]);

  const swrKey = isSignedIn && cartItems.length > 0
    ? ['checkoutOptions', cartLinesKey, selectedCheckoutVendorOrgId]
    : null;

  const swrFetcher = async () => {
    const lines = cartItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));
    const result = await getCartCheckoutOptionsAction(lines, selectedCheckoutVendorOrgId || null);
    if (!result.success) {
      throw new Error(result.error || 'Failed to load checkout options.');
    }
    return result;
  };

  const { 
    data: checkoutOptionsData, 
    error: checkoutOptionsError, 
    isValidating: optionsLoading
  } = useSWR(swrKey, swrFetcher, { revalidateOnFocus: false, dedupingInterval: 5000 });

  useEffect(() => {
    if (!isSignedIn || cartItems.length === 0) {
      if (cartItems.length === 0) {
        setCheckoutOptions({
          fulfillment: [],
          payment: [],
          pickupBranches: [],
          vendorBankTransferByOrg: {},
          vendorCartSummary: [],
        });
        setVendorCount(0);
        setSelectedCheckoutVendorOrgId('');
        setRequiresVendorSelection(false);
        setSelectedCheckoutProductIds([]);
        setPickupBranchId('');
        prevCartItemIdsRef.current = [];
        prevCheckoutVendorOrgIdRef.current = '';
      }
      return;
    }

    if (checkoutOptionsData && checkoutOptionsData.success) {
      setCheckoutOptions({
        fulfillment: checkoutOptionsData.fulfillment,
        payment: checkoutOptionsData.payment,
        pickupBranches: checkoutOptionsData.pickupBranches,
        vendorBankTransferByOrg: checkoutOptionsData.vendorBankTransferByOrg,
        vendorCartSummary: checkoutOptionsData.vendorCartSummary,
      });

      setVendorCount(checkoutOptionsData.vendorCount ?? 0);
      setRequiresVendorSelection(checkoutOptionsData.requiresVendorSelection ?? false);

      if (checkoutOptionsData.checkoutVendorOrgId) {
        setSelectedCheckoutVendorOrgId(checkoutOptionsData.checkoutVendorOrgId);
        
        if (prevCheckoutVendorOrgIdRef.current !== checkoutOptionsData.checkoutVendorOrgId) {
           const vendorItemIds = checkoutOptionsData.vendorCartSummary
             .find(v => v.orgId === checkoutOptionsData.checkoutVendorOrgId)?.productIds || [];
           setSelectedCheckoutProductIds(vendorItemIds);
           prevCheckoutVendorOrgIdRef.current = checkoutOptionsData.checkoutVendorOrgId;
        }

        if (checkoutOptionsData.pickupBranches.length > 0) {
          const defaultBranch = checkoutOptionsData.pickupBranches[0].branches[0];
          if (defaultBranch && (!pickupBranchId || !checkoutOptionsData.pickupBranches.some(o => o.branches.some(b => b.id === pickupBranchId)))) {
            setPickupBranchId(defaultBranch.id);
          }
        }
      }
    }
  }, [checkoutOptionsData, isSignedIn, cartItems.length, pickupBranchId]);

  return {
    fulfillmentMethod,
    setFulfillmentMethod,
    paymentMethod,
    setPaymentMethod,
    pickupBranchId,
    setPickupBranchId,
    checkoutOptions,
    setCheckoutOptions,
    vendorCount,
    setVendorCount,
    selectedCheckoutVendorOrgId,
    setSelectedCheckoutVendorOrgId,
    requiresVendorSelection,
    setRequiresVendorSelection,
    selectedCheckoutProductIds,
    setSelectedCheckoutProductIds,
    priceSyncNotice,
    setPriceSyncNotice,
    checkoutOptionsData,
    checkoutOptionsError,
    optionsLoading,
  };
}
