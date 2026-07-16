'use client';

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useClerkAuthRedirectUrl } from '@/features/auth/hooks/useClerkAuthRedirectUrl';
import { useCart } from '@/features/cart/context/CartContext';
import {
  getCartCheckoutOptionsAction,
  sendCartSummaryEmailAction,
  simulatedCheckoutAction,
  syncCartPricesAction,
  getCustomerDeliveryDetailsAction,
} from '@/features/cart/checkout.actions';
import { isPaymentCompatibleWithFulfillment } from '@/features/organization/checkout-options.shared';
import { calculateCheckoutTotals } from '@/features/billing/checkout-totals';
import {
  BANK_TRANSFER_PAYMENT_ID,
  isBankTransferPayment,
  type BankTransferCheckoutInstructions,
} from '@/features/billing/bank-transfer';
import {
  clearCheckoutSuccessSnapshot,
  loadCheckoutSuccessSnapshot,
  saveCheckoutSuccessSnapshot,
} from '@/features/cart/checkout-success-storage';
import {
  groupCartItemsByVendor,
  resolveCheckoutCartItems,
  syncSelectedProductIds,
  toggleAllProductsInSelection,
  toggleProductInSelection,
} from '@/features/cart/vendor-checkout';
import { toast } from 'sonner';

import { CartLoadingState } from './CartStates';
import { CheckoutSuccessState } from './CheckoutSuccessState';
import { CartVendorGroups } from './CartVendorGroups';
import { CartCheckoutSidebar } from './CartCheckoutSidebar';

interface CartClientManagerProps {
  emptyState: React.ReactNode;
}

export function CartClientManager({ emptyState }: CartClientManagerProps) {
  const {
    cartItems,
    removeFromCart,
    removeItemsByIds,
    updateQuantity,
    clearCart,
    syncCartPrices,
    cartTotal,
    cartCount,
    isCartReady,
  } = useCart();

  const authRedirectUrl = useClerkAuthRedirectUrl();
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const [confirmedOrderEmail, setConfirmedOrderEmail] = useState('');
  const [confirmedOrderId, setConfirmedOrderId] = useState('');
  const [bankTransferInstructions, setBankTransferInstructions] = useState<BankTransferCheckoutInstructions | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState('store_pickup');
  const [paymentMethod, setPaymentMethod] = useState(BANK_TRANSFER_PAYMENT_ID);
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingAddressLine2, setShippingAddressLine2] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingPhone2, setShippingPhone2] = useState('');

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    switch (name) {
      case 'shippingAddress': setShippingAddress(value); break;
      case 'shippingAddressLine2': setShippingAddressLine2(value); break;
      case 'shippingCity': setShippingCity(value); break;
      case 'shippingState': setShippingState(value); break;
      case 'shippingPostalCode': setShippingPostalCode(value); break;
      case 'shippingCountry': setShippingCountry(value); break;
      case 'shippingPhone': setShippingPhone(value); break;
      case 'shippingPhone2': setShippingPhone2(value); break;
    }
  };

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
  const [remainingCartCount, setRemainingCartCount] = useState(0);
  const [selectedCheckoutProductIds, setSelectedCheckoutProductIds] = useState<string[]>([]);
  const [priceSyncNotice, setPriceSyncNotice] = useState<string | null>(null);

  const cartItemIds = cartItems.map((item) => item.id).join(',');
  const cartLinesKey = cartItems.map((item) => `${item.id}:${item.quantity}`).join(',');
  const prevCartItemIdsRef = useRef<string[]>([]);
  const prevCheckoutVendorOrgIdRef = useRef('');

  useEffect(() => {
    async function loadSavedDeliveryDetails() {
      if (isSignedIn) {
        const details = await getCustomerDeliveryDetailsAction();
        if (details) {
          if (details.shippingAddress) setShippingAddress(details.shippingAddress);
          if (details.shippingAddressLine2) setShippingAddressLine2(details.shippingAddressLine2);
          if (details.shippingCity) setShippingCity(details.shippingCity);
          if (details.shippingState) setShippingState(details.shippingState);
          if (details.shippingPostalCode) setShippingPostalCode(details.shippingPostalCode);
          if (details.shippingCountry) setShippingCountry(details.shippingCountry);
          if (details.shippingPhone) setShippingPhone(details.shippingPhone);
          if (details.shippingPhone2) setShippingPhone2(details.shippingPhone2);
        }
      }
    }
    loadSavedDeliveryDetails();
  }, [isSignedIn]);

  useEffect(() => {
    const saved = loadCheckoutSuccessSnapshot();
    if (!saved) return;

    setConfirmedOrderEmail(saved.confirmedOrderEmail);
    setConfirmedOrderId(saved.orderId);
    setBankTransferInstructions(saved.bankTransferInstructions);
    setConfirmationEmailSent(saved.confirmationEmailSent);
    setCheckoutStatus('success');

    clearCheckoutSuccessSnapshot();
  }, []);

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
  }, [cartItemIds, syncCartPrices]);

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

    if (checkoutOptionsError) {
      toast.error(checkoutOptionsError.message || 'Failed to load checkout options. Please refresh the page.');
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
      setFulfillmentMethod('');
      setPaymentMethod('');
      setPickupBranchId('');
      return;
    }

    if (checkoutOptionsData) {
      const result = checkoutOptionsData;
      
      setCheckoutOptions({
        fulfillment: result.fulfillment,
        payment: result.payment,
        pickupBranches: result.pickupBranches,
        vendorBankTransferByOrg: result.vendorBankTransferByOrg || {},
        vendorCartSummary: result.vendorCartSummary || [],
      });
      setVendorCount(result.vendorCount);
      setRequiresVendorSelection(result.requiresVendorSelection === true);

      if (result.checkoutVendorOrgId) {
        setSelectedCheckoutVendorOrgId(result.checkoutVendorOrgId);
        if (!prevCheckoutVendorOrgIdRef.current) {
          prevCheckoutVendorOrgIdRef.current = result.checkoutVendorOrgId;
        }
      } else if (
        result.vendorCount > 1 &&
        result.vendorCartSummary.length > 0 &&
        !selectedCheckoutVendorOrgId
      ) {
        const firstVendor = result.vendorCartSummary[0];
        setSelectedCheckoutVendorOrgId(firstVendor.orgId);
        setSelectedCheckoutProductIds(firstVendor.productIds);
        prevCheckoutVendorOrgIdRef.current = firstVendor.orgId;
      }

      const nextFulfillmentId = result.fulfillment.some((o) => o.id === fulfillmentMethod)
        ? fulfillmentMethod
        : (result.fulfillment[0]?.id || '');
      const nextFulfillment = result.fulfillment.find((o) => o.id === nextFulfillmentId);

      setFulfillmentMethod(nextFulfillmentId);
      if (!nextFulfillment?.requiresBranch) {
        setPickupBranchId('');
      } else {
        const allBranches = result.pickupBranches.flatMap((pb: any) => pb.branches);
        if (allBranches.length === 1) {
          setPickupBranchId(allBranches[0].id);
        } else if (!allBranches.some((b: any) => b.id === pickupBranchId)) {
          setPickupBranchId('');
        }
      }

      const compatiblePayments = result.payment.filter((payment) =>
        nextFulfillment
          ? isPaymentCompatibleWithFulfillment(
              { requiresDelivery: payment.requiresDelivery },
              { requiresBranch: nextFulfillment.requiresBranch }
            )
          : true
      );
      const nextPaymentId = compatiblePayments.some((o) => o.id === paymentMethod)
        ? paymentMethod
        : (compatiblePayments[0]?.id || '');
      setPaymentMethod(nextPaymentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOptionsData, checkoutOptionsError, isSignedIn, cartItems.length, selectedCheckoutVendorOrgId]);

  const selectedCheckoutProductIdSet = new Set(selectedCheckoutProductIds);
  const selectedVendorSummary =
    checkoutOptions.vendorCartSummary.find((vendor) => vendor.orgId === selectedCheckoutVendorOrgId) ||
    checkoutOptions.vendorCartSummary[0];
  const checkoutCartItems = resolveCheckoutCartItems(
    cartItems,
    selectedCheckoutProductIds,
    vendorCount > 1 ? selectedVendorSummary?.productIds : null
  );
  const checkoutSubtotal = checkoutCartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const checkoutItemCount = checkoutCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const vendorCartGroups = groupCartItemsByVendor(cartItems, checkoutOptions.vendorCartSummary);
  const showProductCheckoutSelection = Boolean(isSignedIn);
  const showVendorCheckoutSelection = Boolean(isSignedIn) && vendorCount > 1;

  const handleSelectCheckoutVendor = (orgId: string, productIds: string[]) => {
    if (prevCheckoutVendorOrgIdRef.current === orgId) return;
    prevCheckoutVendorOrgIdRef.current = orgId;
    setSelectedCheckoutVendorOrgId(orgId);
    setSelectedCheckoutProductIds(productIds);
    setPickupBranchId('');
  };

  const toggleProductCheckout = (productId: string) => {
    setSelectedCheckoutProductIds((prev) => toggleProductInSelection(prev, productId));
  };

  const toggleAllProductsInGroup = (productIds: string[], checked: boolean) => {
    setSelectedCheckoutProductIds((prev) =>
      toggleAllProductsInSelection(prev, productIds, checked)
    );
  };

  const selectedFulfillment = checkoutOptions.fulfillment.find((o) => o.id === fulfillmentMethod);
  const requiresDeliveryAddress = Boolean(selectedFulfillment && !selectedFulfillment.requiresBranch);
  const compatiblePayments = checkoutOptions.payment.filter((payment) =>
    selectedFulfillment
      ? isPaymentCompatibleWithFulfillment(
          { requiresDelivery: payment.requiresDelivery },
          { requiresBranch: selectedFulfillment.requiresBranch }
        )
      : true
  );
  const selectedPayment = compatiblePayments.find((o) => o.id === paymentMethod);
  const pickupBranches = checkoutOptions.pickupBranches[0]?.branches || [];

  const handleFulfillmentChange = (optionId: string) => {
    const option = checkoutOptions.fulfillment.find((o) => o.id === optionId);
    setFulfillmentMethod(optionId);
    if (!option?.requiresBranch) {
      setPickupBranchId('');
    } else {
      const allBranches = checkoutOptions.pickupBranches.flatMap((pb) => pb.branches);
      if (allBranches.length === 1) {
        setPickupBranchId(allBranches[0].id);
      } else if (!allBranches.some((b: any) => b.id === pickupBranchId)) {
        setPickupBranchId('');
      }
    }

    const paymentsForFulfillment = checkoutOptions.payment.filter((payment) =>
      option
        ? isPaymentCompatibleWithFulfillment(
            { requiresDelivery: payment.requiresDelivery },
            { requiresBranch: option.requiresBranch }
          )
        : true
    );
    if (!paymentsForFulfillment.some((o) => o.id === paymentMethod)) {
      setPaymentMethod(paymentsForFulfillment[0]?.id || '');
    }
  };

  useEffect(() => {
    if (selectedFulfillment?.requiresBranch && pickupBranches.length === 1 && !pickupBranchId) {
      setPickupBranchId(pickupBranches[0].id);
    }
  }, [selectedFulfillment, pickupBranches, pickupBranchId]);

  const handleSendInbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;

    const targetEmail = user?.primaryEmailAddress?.emailAddress;
    if (!targetEmail) return;

    setEmailStatus('sending');
    try {
      const res = await sendCartSummaryEmailAction(
        targetEmail,
        cartItems,
        cartTotal,
        selectedFulfillment?.zeroShipping ?? false
      );
      if (res.success) {
        setEmailStatus('idle');
        toast.success(`Cart list successfully sent to ${targetEmail}!`);
      } else {
        setEmailStatus('idle');
        toast.error(res.error || 'Failed to send email.');
      }
    } catch (err: unknown) {
      setEmailStatus('idle');
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(errMsg);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const handleCheckout = async (optionsLoadingArg: boolean) => {
    if (!isSignedIn) return;
    if (checkoutItemCount === 0) {
      toast.error('No items selected for checkout.');
      return;
    }
    if (optionsLoadingArg) {
      return;
    }
    const customerName = user?.fullName || user?.firstName || 'Customer';
    const customerEmail = user?.primaryEmailAddress?.emailAddress || '';

    if (!customerEmail) {
      toast.error('Your account does not have an email address. Please update your profile before checkout.');
      return;
    }

    if (!selectedFulfillment) {
      toast.error('Please select a fulfillment method.');
      return;
    }
    if (!selectedPayment) {
      toast.error('Please select a payment method.');
      return;
    }
    if (selectedFulfillment.requiresBranch && !pickupBranchId) {
      toast.error('Please select a store branch for pickup.');
      return;
    }
    if (requiresDeliveryAddress) {
      if (!shippingAddress.trim() || shippingAddress.trim().length < 5 || !shippingCity.trim() || !shippingState.trim() || !shippingPostalCode.trim()) {
        toast.error('Please enter a complete delivery address for home delivery (Street, City, State, and Postal Code are required).');
        return;
      }
    }

    if (vendorCount > 1 && !selectedCheckoutVendorOrgId) {
      toast.error('Select a vendor to checkout.');
      return;
    }
    if (checkoutCartItems.length === 0) {
      toast.error('Tick at least one product to checkout.');
      return;
    }

    const checkoutTotalsForOrder = calculateCheckoutTotals(
      checkoutSubtotal,
      selectedFulfillment?.zeroShipping ?? false
    );

    setCheckoutStatus('processing');

    try {
      const result = await simulatedCheckoutAction(
        customerName,
        customerEmail,
        checkoutCartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorName: item.vendorName,
          type: item.type,
        })),
        checkoutTotalsForOrder.grandTotal,
        fulfillmentMethod,
        paymentMethod,
        selectedFulfillment.requiresBranch ? pickupBranchId : null,
        requiresDeliveryAddress ? shippingAddress.trim() : null,
        requiresDeliveryAddress ? shippingPhone.trim() || null : null,
        vendorCount > 1 ? selectedCheckoutVendorOrgId : null,
        requiresDeliveryAddress ? shippingAddressLine2.trim() || null : null,
        requiresDeliveryAddress ? shippingCity.trim() : null,
        requiresDeliveryAddress ? shippingState.trim() : null,
        requiresDeliveryAddress ? shippingPostalCode.trim() : null,
        requiresDeliveryAddress ? shippingCountry.trim() || null : null,
        requiresDeliveryAddress ? shippingPhone2.trim() || null : null
      );

      if (result.success) {
        const checkedOutIds = checkoutCartItems.map((item) => item.id);
        const remainingItems = cartItems.filter((item) => !checkedOutIds.includes(item.id));
        removeItemsByIds(checkedOutIds);
        setRemainingCartCount(
          remainingItems.reduce((sum, item) => sum + item.quantity, 0)
        );
        setConfirmedOrderEmail(customerEmail);
        setConfirmedOrderId(result.orderId || '');
        setBankTransferInstructions(result.bankTransferInstructions || null);
        setConfirmationEmailSent(result.confirmationEmailSent === true);
        saveCheckoutSuccessSnapshot({
          orderId: result.orderId || '',
          confirmedOrderEmail: customerEmail,
          bankTransferInstructions: result.bankTransferInstructions || null,
          confirmationEmailSent: result.confirmationEmailSent === true,
        });
        setCheckoutStatus('success');
        setFulfillmentMethod('store_pickup');
        setPaymentMethod(BANK_TRANSFER_PAYMENT_ID);
        setPickupBranchId('');
      } else {
        setCheckoutStatus('idle');
        toast.error(result.error || 'Checkout failed.');
      }
    } catch (err) {
      setCheckoutStatus('idle');
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const handleSuccessClose = () => {
    clearCheckoutSuccessSnapshot();
    setCheckoutStatus('idle');
    setRemainingCartCount(0);
    if (remainingCartCount > 0) {
      router.push('/cart');
      return;
    }
    router.push('/products');
  };

  const checkoutTotals = calculateCheckoutTotals(
    checkoutSubtotal,
    selectedFulfillment?.zeroShipping ?? false
  );
  const { taxAmount: estimatedTax, shippingAmount: shippingFee, grandTotal } = checkoutTotals;
  const bankTransferSelected =
    isBankTransferPayment(paymentMethod) &&
    selectedCheckoutVendorOrgId.length > 0 &&
    checkoutOptions.vendorBankTransferByOrg[selectedCheckoutVendorOrgId] != null;
  const bankTransferMissingDetails =
    bankTransferSelected &&
    !checkoutOptions.vendorBankTransferByOrg[selectedCheckoutVendorOrgId]?.configured;

  const checkoutErrors: string[] = [];
  if (isSignedIn && cartItems.length > 0) {
    if (vendorCount > 1 && !selectedCheckoutVendorOrgId) {
      checkoutErrors.push('Select a vendor to checkout.');
    }
    if (checkoutCartItems.length === 0 || selectedCheckoutProductIds.length === 0) {
      checkoutErrors.push('Tick at least one product to checkout.');
    }
    if (!selectedFulfillment) {
      checkoutErrors.push('Select a Delivery & Payment option (Fulfillment).');
    } else if (selectedFulfillment.requiresBranch && !pickupBranchId) {
      checkoutErrors.push('Select a store branch for pickup.');
    }
    if (requiresDeliveryAddress) {
      if (!shippingAddress.trim() || shippingAddress.trim().length < 5 || !shippingCity.trim() || !shippingState.trim() || !shippingPostalCode.trim()) {
        checkoutErrors.push('Provide complete delivery details (Street, City, State, and Postal Code are required).');
      }
    }
    if (!paymentMethod) {
      checkoutErrors.push('Select a payment method.');
    } else if (bankTransferMissingDetails) {
      checkoutErrors.push('Selected bank transfer but the vendor has not configured their bank details.');
    }
  }

  if (checkoutStatus === 'success') {
    return (
      <CheckoutSuccessState
        confirmedOrderId={confirmedOrderId}
        confirmedOrderEmail={confirmedOrderEmail}
        bankTransferInstructions={bankTransferInstructions}
        confirmationEmailSent={confirmationEmailSent}
        remainingCartCount={remainingCartCount}
        onClose={handleSuccessClose}
      />
    );
  }

  if (!isCartReady) {
    return <CartLoadingState />;
  }

  if (cartItems.length === 0) {
    return <>{emptyState}</>;
  }

  const leftCol = (
    <CartVendorGroups
      vendorCartGroups={vendorCartGroups}
      showVendorCheckoutSelection={showVendorCheckoutSelection}
      showProductCheckoutSelection={showProductCheckoutSelection}
      selectedCheckoutVendorOrgId={selectedCheckoutVendorOrgId}
      selectedCheckoutProductIdSet={selectedCheckoutProductIdSet}
      onSelectCheckoutVendor={handleSelectCheckoutVendor}
      onToggleProductCheckout={toggleProductCheckout}
      onToggleAllProductsInGroup={toggleAllProductsInGroup}
      updateQuantity={updateQuantity}
      removeFromCart={removeFromCart}
    />
  );

  const rightCol = (
    <CartCheckoutSidebar
      priceSyncNotice={priceSyncNotice}
      isSignedIn={Boolean(isSignedIn)}
      checkoutItemCount={checkoutItemCount}
      cartCount={cartCount}
      vendorCount={vendorCount}
      selectedVendorSummary={selectedVendorSummary}
      checkoutSubtotal={checkoutSubtotal}
      cartTotal={cartTotal}
      estimatedTax={estimatedTax}
      shippingFee={shippingFee}
      grandTotal={grandTotal}
      formatPrice={formatPrice}
      authRedirectUrl={authRedirectUrl ?? null}
      user={user}
      optionsLoading={optionsLoading}
      requiresVendorSelection={requiresVendorSelection}
      selectedCheckoutProductIds={selectedCheckoutProductIds}
      checkoutOptions={checkoutOptions}
      fulfillmentMethod={fulfillmentMethod}
      handleFulfillmentChange={handleFulfillmentChange}
      selectedFulfillment={selectedFulfillment}
      pickupBranches={pickupBranches}
      pickupBranchId={pickupBranchId}
      setPickupBranchId={setPickupBranchId}
      requiresDeliveryAddress={requiresDeliveryAddress}
      shippingAddress={shippingAddress}
      shippingAddressLine2={shippingAddressLine2}
      shippingCity={shippingCity}
      shippingState={shippingState}
      shippingPostalCode={shippingPostalCode}
      shippingCountry={shippingCountry}
      shippingPhone={shippingPhone}
      shippingPhone2={shippingPhone2}
      handleAddressChange={handleAddressChange}
      compatiblePayments={compatiblePayments}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      bankTransferSelected={bankTransferSelected}
      bankTransferMissingDetails={bankTransferMissingDetails}
      checkoutErrors={checkoutErrors}
      handleCheckout={handleCheckout}
      checkoutStatus={checkoutStatus}
      cartItems={cartItems}
      clearCart={clearCart}
      handleSendInbox={handleSendInbox}
      emailStatus={emailStatus}
    />
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 space-y-4">
        {leftCol}
      </div>
      <div className="lg:col-span-4 space-y-4">
        {rightCol}
      </div>
    </div>
  );
}
