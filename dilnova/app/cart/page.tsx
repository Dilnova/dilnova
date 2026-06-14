'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { useClerkAuthRedirectUrl } from '@/app/hooks/useClerkAuthRedirectUrl';
import { useCart } from '@/features/cart/context/CartContext';
import { isVideoUrl } from '@/shared/media/media';
import {
  getCartCheckoutOptionsAction,
  sendCartSummaryEmailAction,
  simulatedCheckoutAction,
  syncCartPricesAction,
} from '@/features/cart/checkout.actions';
import { isPaymentCompatibleWithFulfillment } from '@/features/organization/checkout-options.shared';
import { calculateCheckoutTotals } from '@/features/billing/checkout-totals';
import {
  BANK_TRANSFER_PAYMENT_ID,
  isBankTransferPayment,
  type BankTransferCheckoutInstructions,
} from '@/features/billing/bank-transfer';
import BankTransferInstructions from '@/app/components/BankTransferInstructions';
import { CustomerPaymentSlipSection } from '@/features/orders/components/OrderPaymentPanels';
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

export default function CartPage() {
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmedOrderEmail, setConfirmedOrderEmail] = useState('');
  const [confirmedOrderId, setConfirmedOrderId] = useState('');
  const [bankTransferInstructions, setBankTransferInstructions] =
    useState<BankTransferCheckoutInstructions | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState('store_pickup');
  const [paymentMethod, setPaymentMethod] = useState(BANK_TRANSFER_PAYMENT_ID);
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [checkoutOptions, setCheckoutOptions] = useState<{
    fulfillment: { id: string; label: string; description?: string; zeroShipping: boolean; requiresBranch: boolean }[];
    payment: { id: string; label: string; description?: string; requiresDelivery: boolean; pendingPayment?: boolean }[];
    pickupBranches: { orgId: string; branches: { id: string; name: string; address: string | null; phone: string | null }[] }[];
    vendorBankTransferByOrg: Record<
      string,
      {
        vendorName: string;
        configured: boolean;
      }
    >;
    vendorCartSummary: {
      orgId: string;
      vendorName: string;
      subtotalCents: number;
      productIds: string[];
      itemCount: number;
    }[];
  }>({ fulfillment: [], payment: [], pickupBranches: [], vendorBankTransferByOrg: {}, vendorCartSummary: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
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
    const saved = loadCheckoutSuccessSnapshot();
    if (!saved) return;

    setConfirmedOrderEmail(saved.confirmedOrderEmail);
    setConfirmedOrderId(saved.orderId);
    setBankTransferInstructions(saved.bankTransferInstructions);
    setConfirmationEmailSent(saved.confirmationEmailSent);
    setCheckoutStatus('success');
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) {
      setPriceSyncNotice(null);
      return;
    }

    let cancelled = false;
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

    return () => {
      cancelled = true;
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
        setOptionsError(null);
        setOptionsLoading(false);
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

    let active = true;
    setOptionsLoading(true);
    setOptionsError(null);

    const lines = cartItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const loadTimeout = window.setTimeout(() => {
      if (!active) return;
      setOptionsLoading(false);
      setOptionsError('Checkout options timed out. Please refresh the page and try again.');
    }, 20000);

    getCartCheckoutOptionsAction(
      lines,
      selectedCheckoutVendorOrgId || null
    )
      .then((result) => {
        if (!active) return;

        if (!result.success) {
          setOptionsError(result.error || 'Failed to load checkout options.');
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
      })
      .catch(() => {
        if (!active) return;
        setOptionsError('Failed to load checkout options. Please refresh the page.');
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
      })
      .finally(() => {
        window.clearTimeout(loadTimeout);
        if (active) setOptionsLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadTimeout);
    };
  }, [cartLinesKey, isSignedIn, selectedCheckoutVendorOrgId]);

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
  const showProductCheckoutSelection = isSignedIn;
  const showVendorCheckoutSelection = isSignedIn && vendorCount > 1;

  const handleSelectCheckoutVendor = (orgId: string, productIds: string[]) => {
    if (prevCheckoutVendorOrgIdRef.current === orgId) return;
    prevCheckoutVendorOrgIdRef.current = orgId;
    setSelectedCheckoutVendorOrgId(orgId);
    setSelectedCheckoutProductIds(productIds);
    setPickupBranchId('');
    setCheckoutError(null);
  };

  const toggleProductCheckout = (productId: string) => {
    setSelectedCheckoutProductIds((prev) => toggleProductInSelection(prev, productId));
    setCheckoutError(null);
  };

  const toggleAllProductsInGroup = (productIds: string[], checked: boolean) => {
    setSelectedCheckoutProductIds((prev) =>
      toggleAllProductsInSelection(prev, productIds, checked)
    );
    setCheckoutError(null);
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

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    router.back();
  };

  const handleSendInbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;

    const targetEmail = user?.primaryEmailAddress?.emailAddress;
    if (!targetEmail) return;

    setEmailStatus('sending');
    setEmailError(null);
    try {
      const res = await sendCartSummaryEmailAction(
        targetEmail,
        cartItems,
        cartTotal,
        selectedFulfillment?.zeroShipping ?? false
      );
      if (res.success) {
        setEmailStatus('success');
        setEmailMessage(`Cart list successfully sent to ${targetEmail}!`);
        setTimeout(() => {
          setEmailStatus('idle');
        }, 4000);
      } else {
        setEmailStatus('idle');
        setEmailError(res.error || 'Failed to send email.');
      }
    } catch (err: unknown) {
      setEmailStatus('idle');
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setEmailError(errMsg);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const handleCheckout = async () => {
    setCheckoutError(null);

    if (!isSignedIn) {
      setCheckoutError('Please sign in to place an order.');
      return;
    }

    const customerName = user?.fullName || user?.firstName || 'Customer';
    const customerEmail = user?.primaryEmailAddress?.emailAddress || '';

    if (!customerEmail) {
      setCheckoutError('Your account does not have an email address. Please update your profile before checkout.');
      return;
    }

    if (!selectedFulfillment) {
      setCheckoutError('Please select a fulfillment method.');
      return;
    }
    if (!selectedPayment) {
      setCheckoutError('Please select a payment method.');
      return;
    }
    if (selectedFulfillment.requiresBranch && !pickupBranchId) {
      setCheckoutError('Please select a store branch for pickup.');
      return;
    }
    if (requiresDeliveryAddress) {
      if (!shippingAddress.trim() || shippingAddress.trim().length < 5) {
        setCheckoutError('Please enter a complete delivery address for home delivery.');
        return;
      }
    }

    if (vendorCount > 1 && !selectedCheckoutVendorOrgId) {
      setCheckoutError('Select a vendor to checkout.');
      return;
    }
    if (checkoutCartItems.length === 0) {
      setCheckoutError('Tick at least one product to checkout.');
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
        vendorCount > 1 ? selectedCheckoutVendorOrgId : null
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
        setCheckoutError(result.error || 'Checkout failed.');
      }
    } catch (err) {
      setCheckoutStatus('idle');
      setCheckoutError(err instanceof Error ? err.message : 'An unexpected error occurred.');
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

  if (checkoutStatus === 'success') {
    const isBankTransferOrder = Boolean(bankTransferInstructions);

    return (
      <main className="min-h-[80vh] flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
        <div className="max-w-lg w-full border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 bg-white dark:bg-zinc-900 shadow-xl space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 text-3xl">
              ✓
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {isBankTransferOrder ? 'Order Placed' : 'Order Confirmed!'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isBankTransferOrder ? (
                <>
                  Your order has been received and is awaiting bank transfer payment.
                  {confirmedOrderEmail && (
                    <>
                      {' '}
                      {confirmationEmailSent ? (
                        <>A confirmation with payment instructions was sent to <strong className="text-zinc-700 dark:text-zinc-200">{confirmedOrderEmail}</strong>.</>
                      ) : (
                        <>Use the details below to complete your transfer. Save this page or note your payment reference.</>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  Thank you for your order.
                  {confirmedOrderEmail && (
                    <>
                      {' '}
                      {confirmationEmailSent ? (
                        <>A confirmation was sent to <strong className="text-zinc-700 dark:text-zinc-200">{confirmedOrderEmail}</strong>.</>
                      ) : (
                        <>Order updates will use <strong className="text-zinc-700 dark:text-zinc-200">{confirmedOrderEmail}</strong>.</>
                      )}
                    </>
                  )}
                </>
              )}
            </p>
            {confirmedOrderId && (
              <p className="text-[11px] font-mono text-zinc-400">
                Order ID: {confirmedOrderId.slice(0, 8).toUpperCase()}
              </p>
            )}
            {remainingCartCount > 0 && (
              <p className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                {remainingCartCount} item{remainingCartCount === 1 ? '' : 's'} from other vendors remain in your cart. Return to the cart to checkout the next vendor.
              </p>
            )}
          </div>

          {bankTransferInstructions && (
            <BankTransferInstructions instructions={bankTransferInstructions} compact />
          )}

          {isBankTransferOrder && confirmedOrderId && confirmedOrderEmail && (
            <CustomerPaymentSlipSection
              order={{
                id: confirmedOrderId,
                paymentMethod: BANK_TRANSFER_PAYMENT_ID,
                status: 'pending_payment',
                customerEmail: confirmedOrderEmail,
              }}
            />
          )}

          <div className="border-t border-zinc-100 dark:border-zinc-850 pt-6 space-y-3">
            {confirmedOrderId && (
              <Link
                href={`/customer/invoice/${confirmedOrderId}`}
                className="block w-full text-center py-3 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all hover:bg-purple-50 dark:hover:bg-purple-950/20"
              >
                View Invoice
              </Link>
            )}
            <button
              onClick={handleSuccessClose}
              className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
            >
              {remainingCartCount > 0 ? 'Back to Cart' : 'Continue Shopping'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans pb-24">
      {/* Top Header Bar */}
      <div className="max-w-6xl mx-auto px-6 pt-10 flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
            <Link href="/products" className="hover:text-purple-500 transition-colors">
              CATALOG
            </Link>
            <span>/</span>
            <span className="text-zinc-650 dark:text-zinc-350 font-bold uppercase">
              SHOPPING CART
            </span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-3">
            <span>Your Shopping Cart</span>
            {cartCount > 0 && (
              <span className="text-xs font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 px-3 py-1 rounded-full">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </h1>
        </div>

        <button
          onClick={handleGoBack}
          className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100/50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          &larr; Continue Shopping
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {!isCartReady ? (
          <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/10 shadow-sm max-w-xl mx-auto space-y-4">
            <span className="text-4xl animate-pulse">🛒</span>
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Loading your cart...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/10 shadow-sm max-w-xl mx-auto space-y-4">
            <span className="text-4xl">🛍️</span>
            <div className="space-y-1">
              <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-zinc-400">Your cart is empty</h2>
              <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                Add products or services from our multi-vendor catalog to get started.
              </p>
            </div>
            <button
              onClick={handleGoBack}
              className="inline-block text-[10px] bg-purple-700 hover:bg-purple-800 text-white font-bold font-mono uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-md shadow-purple-900/10 cursor-pointer"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Cart Items grouped by vendor */}
            <div className="lg:col-span-8 space-y-4">
              {showVendorCheckoutSelection && (
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-xl px-4 py-3">
                  Select a vendor, tick the products you want, then checkout. Unticked items stay in your cart.
                </p>
              )}
              {showProductCheckoutSelection && !showVendorCheckoutSelection && (
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-xl px-4 py-3">
                  Tick the products you want to checkout. Unticked items stay in your cart.
                </p>
              )}

              <div className="space-y-4">
                {vendorCartGroups.map((group) => {
                  const isSelectedForCheckout =
                    !showVendorCheckoutSelection || selectedCheckoutVendorOrgId === group.orgId;
                  const groupProductIds = group.items.map((item) => item.id);
                  const groupSelectedCount = group.items.filter((item) =>
                    selectedCheckoutProductIdSet.has(item.id)
                  ).length;
                  const allGroupProductsSelected =
                    group.items.length > 0 &&
                    group.items.every((item) => selectedCheckoutProductIdSet.has(item.id));
                  const showProductTicks =
                    showProductCheckoutSelection &&
                    (isSelectedForCheckout || !showVendorCheckoutSelection);

                  return (
                    <section
                      key={group.orgId}
                      className={`bg-white border rounded-2xl p-6 dark:bg-zinc-950 shadow-sm transition-all ${
                        showVendorCheckoutSelection
                          ? isSelectedForCheckout
                            ? 'border-purple-500/50 bg-purple-500/[0.03] ring-1 ring-purple-500/20'
                            : 'border-zinc-200/80 dark:border-zinc-900 opacity-75'
                          : 'border-zinc-200/80 dark:border-zinc-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b border-zinc-100 dark:border-zinc-900">
                        {showVendorCheckoutSelection ? (
                          <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                            <input
                              type="radio"
                              name="checkout-vendor"
                              value={group.orgId}
                              checked={selectedCheckoutVendorOrgId === group.orgId}
                              onChange={() =>
                                handleSelectCheckoutVendor(group.orgId, groupProductIds)
                              }
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                                Checkout vendor
                              </span>
                              <span className="block text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                                {group.vendorName}
                              </span>
                              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                                {group.itemCount} {group.itemCount === 1 ? 'item' : 'items'} ·{' '}
                                {formatPrice(group.subtotalCents)}
                              </span>
                              {isSelectedForCheckout && (
                                <span className="inline-flex mt-2 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                  Selected for checkout
                                </span>
                              )}
                            </span>
                          </label>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                              Vendor
                            </span>
                            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                              {group.vendorName}
                            </h2>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                              {group.itemCount} {group.itemCount === 1 ? 'item' : 'items'} ·{' '}
                              {formatPrice(group.subtotalCents)}
                            </p>
                          </div>
                        )}
                        {showProductTicks && (
                          <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allGroupProductsSelected}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate =
                                    groupSelectedCount > 0 && !allGroupProductsSelected;
                                }
                              }}
                              onChange={() =>
                                toggleAllProductsInGroup(groupProductIds, !allGroupProductsSelected)
                              }
                              className="rounded border-zinc-300 dark:border-zinc-700"
                            />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                              All
                            </span>
                          </label>
                        )}
                      </div>

                      <div className="divide-y divide-zinc-100 dark:divide-zinc-900 space-y-6">
                        {group.items.map((item) => {
                          const isProductSelected = selectedCheckoutProductIdSet.has(item.id);

                          return (
                          <div
                            key={item.id}
                            className={`flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 first:pt-0 last:pb-0 ${
                              showProductTicks && !isProductSelected ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex gap-4 items-center flex-1 min-w-0">
                              {showProductTicks && (
                                <input
                                  type="checkbox"
                                  checked={isProductSelected}
                                  onChange={() => toggleProductCheckout(item.id)}
                                  className="mt-1 shrink-0 rounded border-zinc-300 dark:border-zinc-700"
                                  aria-label={`Include ${item.name} in checkout`}
                                />
                              )}
                              <div className="w-20 h-20 relative flex-shrink-0 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-sm">
                                {item.imageUrl ? (
                                  isVideoUrl(item.imageUrl) ? (
                                    <video
                                      src={item.imageUrl}
                                      muted
                                      loop
                                      playsInline
                                      autoPlay
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                      sizes="80px"
                                    />
                                  )
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xl bg-zinc-100 dark:bg-zinc-900">
                                    📦
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider mb-1.5 ${
                                    item.type === 'service'
                                      ? 'bg-teal-500/10 text-teal-650 dark:text-teal-400'
                                      : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400'
                                  }`}
                                >
                                  {item.type}
                                </span>

                                <Link
                                  href={`/products/${item.id}`}
                                  className="block text-sm font-extrabold text-zinc-900 dark:text-zinc-50 hover:text-purple-650 dark:hover:text-purple-400 transition-colors line-clamp-1"
                                >
                                  {item.name}
                                </Link>
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10">
                              <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-855 dark:text-zinc-400 dark:hover:text-zinc-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 select-none">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-855 dark:text-zinc-400 dark:hover:text-zinc-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right flex flex-col justify-center min-w-[90px]">
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">
                                  {formatPrice(item.price)} each
                                </span>
                                <span className="text-sm font-extrabold font-mono text-zinc-955 dark:text-zinc-50 mt-0.5">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>

                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-zinc-400 hover:text-red-500 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
                                title="Remove item"
                                aria-label="Remove item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            {/* Right side: Summary & Email Box (col-span 4) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Order Summary Card */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm space-y-6">
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
                  Order Summary
                </h2>

                {priceSyncNotice && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    {priceSyncNotice}
                  </p>
                )}

                <div className="space-y-3 text-xs font-mono">
                  {isSignedIn && checkoutItemCount > 0 && checkoutItemCount < cartCount && (
                    <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                      Checkout totals for {checkoutItemCount} ticked{' '}
                      {checkoutItemCount === 1 ? 'item' : 'items'}
                      {vendorCount > 1 && selectedVendorSummary
                        ? ` from ${selectedVendorSummary.vendorName}`
                        : ''}
                      . Unticked items stay in your cart.
                    </p>
                  )}
                  {vendorCount > 1 && selectedVendorSummary && checkoutItemCount === cartCount && (
                    <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                      Checkout totals for {selectedVendorSummary.vendorName} ({checkoutItemCount}{' '}
                      {checkoutItemCount === 1 ? 'item' : 'items'}). Other vendors stay in your cart.
                    </p>
                  )}

                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-200">
                      {formatPrice(vendorCount > 1 ? checkoutSubtotal : cartTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Estimated Tax (8%)</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-200">{formatPrice(estimatedTax)}</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Shipping</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-200">
                      {shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}
                    </span>
                  </div>

                  {shippingFee > 0 && (
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 block text-right mt-1">
                      Add {formatPrice(5000 - (vendorCount > 1 ? checkoutSubtotal : cartTotal))} more for free shipping!
                    </p>
                  )}

                  <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 flex items-center justify-between text-zinc-900 dark:text-zinc-100 font-sans font-bold">
                    <span>Total</span>
                    <span className="text-lg font-black font-mono">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                {/* Sign-in required or signed-in checkout details */}
                {!isSignedIn ? (
                  <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/80 dark:bg-purple-950/20 p-4 space-y-3 text-center">
                      <span className="text-2xl block">🔒</span>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Sign in to checkout
                      </h3>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        An account is required to place orders, track status, upload payment slips, and view invoices.
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-1">
                        <SignInButton mode="modal" forceRedirectUrl={authRedirectUrl ?? '/cart'}>
                          <button
                            type="button"
                            className="w-full sm:w-auto px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                          >
                            Sign In
                          </button>
                        </SignInButton>
                        <SignUpButton mode="modal" forceRedirectUrl={authRedirectUrl ?? '/cart'}>
                          <button
                            type="button"
                            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                          >
                            Create Account
                          </button>
                        </SignUpButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 space-y-1">
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
                      Checkout as
                    </h3>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {user?.fullName || user?.firstName || 'Customer'}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                )}

                {/* Fulfillment & Payment Options — signed-in only */}
                {isSignedIn && cartItems.length > 0 && (
                  <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
                      Delivery & Payment
                    </h3>

                    {optionsError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                        {optionsError}
                      </p>
                    )}

                    {optionsLoading ? (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Loading checkout options...</p>
                    ) : (
                      <>
                        {requiresVendorSelection && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                            Select a vendor on the left and tick products to load delivery and payment options.
                          </p>
                        )}
                        {isSignedIn && selectedCheckoutProductIds.length === 0 && !requiresVendorSelection && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                            Tick at least one product on the left to checkout.
                          </p>
                        )}

                        {checkoutOptions.fulfillment.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Fulfillment</p>
                            {checkoutOptions.fulfillment.map((option) => (
                              <label
                                key={option.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                  fulfillmentMethod === option.id
                                    ? 'border-purple-500/50 bg-purple-500/5'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="fulfillment"
                                  value={option.id}
                                  checked={fulfillmentMethod === option.id}
                                  onChange={() => handleFulfillmentChange(option.id)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0">
                                  <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">{option.label}</span>
                                  {option.description && (
                                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{option.description}</span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : !optionsError ? (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                            {vendorCount > 1
                              ? requiresVendorSelection
                                ? 'Select a vendor on the left to see available fulfillment methods.'
                                : 'No fulfillment methods are enabled for the selected vendor. Contact the store or try another vendor.'
                              : 'No fulfillment methods are enabled for this vendor. Contact the store or try again later.'}
                          </p>
                        ) : null}

                        {selectedFulfillment?.requiresBranch && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Pickup Branch</p>
                            {pickupBranches.length > 0 ? (
                              <select
                                value={pickupBranchId}
                                onChange={(e) => setPickupBranchId(e.target.value)}
                                className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                              >
                                <option value="">Select a branch</option>
                                {pickupBranches.map((branch) => (
                                  <option key={branch.id} value={branch.id}>
                                    {branch.name}{branch.address ? ` — ${branch.address}` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                Store pickup is enabled but no branches are configured for this vendor.
                              </p>
                            )}
                          </div>
                        )}

                        {requiresDeliveryAddress && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Delivery Address</p>
                            <textarea
                              value={shippingAddress}
                              onChange={(e) => setShippingAddress(e.target.value)}
                              rows={3}
                              placeholder="Street address, city, postal code, and any delivery notes"
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-600/50 resize-y"
                            />
                            <input
                              type="tel"
                              value={shippingPhone}
                              onChange={(e) => setShippingPhone(e.target.value)}
                              placeholder="Contact phone for delivery (optional)"
                              className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                            />
                          </div>
                        )}

                        {compatiblePayments.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Payment</p>
                            {compatiblePayments.map((option) => (
                              <label
                                key={option.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                  paymentMethod === option.id
                                    ? 'border-purple-500/50 bg-purple-500/5'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="payment"
                                  value={option.id}
                                  checked={paymentMethod === option.id}
                                  onChange={() => setPaymentMethod(option.id)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0">
                                  <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">{option.label}</span>
                                  {option.description && (
                                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{option.description}</span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : !optionsError ? (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                            {checkoutOptions.payment.length > 0 && selectedFulfillment?.requiresBranch
                              ? 'No payment methods are available for store pickup with the current selection. Choose home delivery or another fulfillment option.'
                              : vendorCount > 1
                                ? requiresVendorSelection
                                  ? 'Select a vendor on the left to see available payment methods.'
                                  : 'No payment methods are enabled for the selected vendor.'
                                : 'No payment methods are enabled for this vendor. Contact the store or try again later.'}
                          </p>
                        ) : null}

                        {bankTransferSelected && (
                          <div className="space-y-2">
                            {bankTransferMissingDetails ? (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                                Bank transfer cannot be completed until {selectedVendorSummary?.vendorName || 'this vendor'} configures bank account details.
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                Bank account details and your payment reference will be shown after you place the order
                                (confirmation screen, email, and invoice).
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {checkoutError && (
                  <div className="bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-xs leading-relaxed whitespace-pre-line">
                    {checkoutError}
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  {!isSignedIn ? (
                    <SignInButton mode="modal" forceRedirectUrl={authRedirectUrl ?? '/cart'}>
                      <button
                        type="button"
                        className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-purple-900/10 transition-all cursor-pointer"
                      >
                        Sign In to Checkout
                      </button>
                    </SignInButton>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      disabled={
                        checkoutStatus === 'processing' ||
                        cartItems.length === 0 ||
                        checkoutCartItems.length === 0 ||
                        optionsLoading ||
                        !!optionsError ||
                        requiresVendorSelection ||
                        selectedCheckoutProductIds.length === 0 ||
                        !selectedFulfillment ||
                        !selectedPayment ||
                        bankTransferMissingDetails ||
                        (vendorCount > 1 && !selectedCheckoutVendorOrgId) ||
                        (requiresDeliveryAddress && shippingAddress.trim().length < 5)
                      }
                      className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 disabled:cursor-not-allowed text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-purple-900/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {checkoutStatus === 'processing' ? (
                        <>
                          <span className="animate-spin text-sm">⏳</span>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>
                          {vendorCount > 1 && selectedVendorSummary
                            ? `Checkout ${selectedVendorSummary.vendorName}`
                            : 'Proceed to Checkout'}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={clearCart}
                    className="w-full text-center py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>

              {/* Send to Inbox Box */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm space-y-4">
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
                  Send Cart to Inbox
                </h2>
                
                {emailStatus === 'success' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-450 p-3.5 rounded-xl text-xs leading-relaxed">
                    {emailMessage}
                  </div>
                ) : !isSignedIn ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Sign in to email a summary of your cart items to your account address.
                    </p>
                    <SignInButton mode="modal" forceRedirectUrl={authRedirectUrl ?? '/cart'}>
                      <button
                        type="button"
                        className="w-full text-center py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Sign In to Email Summary
                      </button>
                    </SignInButton>
                  </div>
                ) : (
                  <form onSubmit={handleSendInbox} className="space-y-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Email the list of these {cartCount} items to your registered address.
                    </p>

                    {emailError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                        {emailError}
                      </p>
                    )}

                    <div className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900 truncate">
                      📧 {user?.primaryEmailAddress?.emailAddress}
                    </div>

                    <button
                      type="submit"
                      disabled={emailStatus === 'sending'}
                      className="w-full text-center py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 disabled:cursor-not-allowed text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {emailStatus === 'sending' ? (
                        <>
                          <span className="animate-spin text-sm">⏳</span>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Email Summary</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
