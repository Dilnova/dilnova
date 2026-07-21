'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useClerkAuthRedirectUrl } from '@/features/auth/hooks/use-clerk-auth-redirect-url';
import { useCart } from '@/features/cart/context/cart-context';
import {
  sendCartSummaryEmailAction,
  simulatedCheckoutAction,
} from '@/features/cart/checkout.actions';
import { isPaymentCompatibleWithFulfillment } from '@/features/organization/checkout-options.shared';
import { calculateCheckoutTotals } from '@/features/billing/checkout-totals';
import {
  BANK_TRANSFER_PAYMENT_ID,
  isBankTransferPayment,
} from '@/features/billing/bank-transfer';
import {
  clearCheckoutSuccessSnapshot,
  saveCheckoutSuccessSnapshot,
} from '@/features/cart/checkout-success-storage';
import {
  groupCartItemsByVendor,
  resolveCheckoutCartItems,
  toggleAllProductsInSelection,
  toggleProductInSelection,
} from '@/features/cart/vendor-checkout';
import { toast } from 'sonner';

import { CartLoadingState } from './CartStates';
import { CheckoutSuccessState } from './CheckoutSuccessState';
import { CartVendorGroups } from './CartVendorGroups';
import { CartCheckoutSidebar } from './CartCheckoutSidebar';

import { useShippingAddressState } from '@/features/cart/hooks/use-shipping-address-state';
import { useCheckoutState } from '@/features/cart/hooks/use-checkout-state';
import { useCheckoutOptionsState } from '@/features/cart/hooks/use-checkout-options-state';

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

  const [remainingCartCount, setRemainingCartCount] = useState(0);

  const {
    checkoutStatus,
    setCheckoutStatus,
    emailStatus,
    setEmailStatus,
    idempotencyKey,
    confirmedOrderEmail,
    setConfirmedOrderEmail,
    confirmedOrderId,
    setConfirmedOrderId,
    bankTransferInstructions,
    setBankTransferInstructions,
    confirmationEmailSent,
    setConfirmationEmailSent,
  } = useCheckoutState();

  const {
    shippingAddress,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountry,
    shippingPhone,
    shippingPhone2,
    handleAddressChange,
  } = useShippingAddressState(Boolean(isSignedIn));

  const {
    fulfillmentMethod,
    setFulfillmentMethod,
    paymentMethod,
    setPaymentMethod,
    pickupBranchId,
    setPickupBranchId,
    checkoutOptions,
    vendorCount,
    selectedCheckoutVendorOrgId,
    setSelectedCheckoutVendorOrgId,
    requiresVendorSelection,
    selectedCheckoutProductIds,
    setSelectedCheckoutProductIds,
    priceSyncNotice,
    optionsLoading,
  } = useCheckoutOptionsState(Boolean(isSignedIn), cartItems, syncCartPrices);

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

  const handleSendInbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;

    const targetEmail = user?.primaryEmailAddress?.emailAddress;
    if (!targetEmail) return;

    setEmailStatus('sending');
    try {
      const res = await sendCartSummaryEmailAction({
        emailAddress: targetEmail,
        cartItems,
        cartTotal,
        zeroShipping: selectedFulfillment?.zeroShipping ?? false
      });
      if (res?.data?.success) {
        setEmailStatus('idle');
        toast.success(`Cart list successfully sent to ${targetEmail}!`);
      } else {
        setEmailStatus('idle');
        toast.error(res?.data?.error || 'Failed to send email.');
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
      const result = await simulatedCheckoutAction({
        customerName,
        customerEmail,
        items: checkoutCartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorName: item.vendorName,
          type: item.type,
        })),
        totalAmount: checkoutTotalsForOrder.grandTotal,
        fulfillmentMethod,
        paymentMethod,
        pickupBranchId: selectedFulfillment.requiresBranch ? pickupBranchId : null,
        shippingAddress: requiresDeliveryAddress ? shippingAddress.trim() : null,
        shippingPhone: requiresDeliveryAddress ? shippingPhone.trim() || null : null,
        checkoutVendorOrgId: vendorCount > 1 ? selectedCheckoutVendorOrgId : null,
        shippingAddressLine2: requiresDeliveryAddress ? shippingAddressLine2.trim() || null : null,
        shippingCity: requiresDeliveryAddress ? shippingCity.trim() : null,
        shippingState: requiresDeliveryAddress ? shippingState.trim() : null,
        shippingPostalCode: requiresDeliveryAddress ? shippingPostalCode.trim() : null,
        shippingCountry: requiresDeliveryAddress ? shippingCountry.trim() || null : null,
        shippingPhone2: requiresDeliveryAddress ? shippingPhone2.trim() || null : null,
        idempotencyKey
      });

      if (result?.data?.success) {
        const checkedOutIds = checkoutCartItems.map((item) => item.id);
        const remainingItems = cartItems.filter((item) => !checkedOutIds.includes(item.id));
        removeItemsByIds(checkedOutIds);
        setRemainingCartCount(
          remainingItems.reduce((sum, item) => sum + item.quantity, 0)
        );
        setConfirmedOrderEmail(customerEmail);
        setConfirmedOrderId('orderId' in result.data ? (result.data.orderId || '') : '');
        setBankTransferInstructions('bankTransferInstructions' in result.data ? (result.data.bankTransferInstructions || null) : null);
        setConfirmationEmailSent('confirmationEmailSent' in result.data ? (result.data.confirmationEmailSent === true) : false);
        saveCheckoutSuccessSnapshot({
          orderId: 'orderId' in result.data ? (result.data.orderId || '') : '',
          confirmedOrderEmail: customerEmail,
          bankTransferInstructions: 'bankTransferInstructions' in result.data ? (result.data.bankTransferInstructions || null) : null,
          confirmationEmailSent: 'confirmationEmailSent' in result.data ? (result.data.confirmationEmailSent === true) : false,
        });
        setCheckoutStatus('success');
        setFulfillmentMethod('store_pickup');
        setPaymentMethod(BANK_TRANSFER_PAYMENT_ID);
        setPickupBranchId('');
      } else {
        setCheckoutStatus('idle');
        const errorMessage = result?.data && 'error' in result.data ? result.data.error : (result?.serverError || 'Checkout failed.');
        toast.error(typeof errorMessage === 'string' ? errorMessage : 'Checkout failed.');
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
