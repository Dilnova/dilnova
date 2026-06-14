'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { useClerkAuthRedirectUrl } from '@/app/hooks/useClerkAuthRedirectUrl';
import { useCart } from '../context/CartContext';
import { isVideoUrl } from '@/utils/media';
import {
  getCartCheckoutOptionsAction,
  sendCartSummaryEmailAction,
  simulatedCheckoutAction,
  syncCartPricesAction,
} from './actions';
import { isPaymentCompatibleWithFulfillment } from '@/utils/checkoutOptionsShared';
import { calculateCheckoutTotals } from '@/utils/checkoutTotals';
import {
  BANK_TRANSFER_PAYMENT_ID,
  isBankTransferPayment,
  type BankTransferCheckoutInstructions,
} from '@/utils/bankTransfer';
import BankTransferInstructions from '@/app/components/BankTransferInstructions';
import { CustomerPaymentSlipSection } from '@/app/components/OrderPaymentPanels';
import {
  clearCheckoutSuccessSnapshot,
  loadCheckoutSuccessSnapshot,
  saveCheckoutSuccessSnapshot,
} from '@/utils/checkoutSuccessStorage';

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
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
    vendorCartSummary: { orgId: string; vendorName: string; subtotalCents: number }[];
  }>({ fulfillment: [], payment: [], pickupBranches: [], vendorBankTransferByOrg: {}, vendorCartSummary: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [vendorCount, setVendorCount] = useState(0);
  const [priceSyncNotice, setPriceSyncNotice] = useState<string | null>(null);
  const cartItemIds = cartItems.map((item) => item.id).join(',');
  const cartLinesKey = cartItems.map((item) => `${item.id}:${item.quantity}`).join(',');

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
        setPickupBranchId('');
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

    getCartCheckoutOptionsAction(lines)
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
      })
      .finally(() => {
        window.clearTimeout(loadTimeout);
        if (active) setOptionsLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadTimeout);
    };
  }, [cartLinesKey, isSignedIn]);

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

    setCheckoutStatus('processing');

    try {
      const result = await simulatedCheckoutAction(
        customerName,
        customerEmail,
        cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorName: item.vendorName,
          type: item.type,
        })),
        grandTotal,
        fulfillmentMethod,
        paymentMethod,
        selectedFulfillment.requiresBranch ? pickupBranchId : null,
        requiresDeliveryAddress ? shippingAddress.trim() : null,
        requiresDeliveryAddress ? shippingPhone.trim() || null : null
      );

      if (result.success) {
        clearCart();
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
    router.push('/products');
  };

  const checkoutTotals = calculateCheckoutTotals(
    cartTotal,
    selectedFulfillment?.zeroShipping ?? false
  );
  const { taxAmount: estimatedTax, shippingAmount: shippingFee, grandTotal } = checkoutTotals;
  const bankTransferSelected =
    isBankTransferPayment(paymentMethod) && checkoutOptions.vendorCartSummary.length > 0;
  const bankTransferMissingDetails =
    bankTransferSelected &&
    checkoutOptions.vendorCartSummary.some(
      (vendor) => !checkoutOptions.vendorBankTransferByOrg[vendor.orgId]?.configured
    );
  const multiVendorPendingPaymentBlocked =
    vendorCount > 1 && selectedPayment?.pendingPayment === true;

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
              Continue Shopping
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
            
            {/* Left side: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm space-y-6">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900 space-y-6">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 first:pt-0 last:pb-0"
                    >
                      {/* Product Details Section */}
                      <div className="flex gap-4 items-center flex-1 min-w-0">
                        {/* Thumbnail */}
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

                        {/* Title and Vendor Metadata */}
                        <div className="flex-1 min-w-0">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider mb-1.5 ${
                            item.type === 'service'
                              ? 'bg-teal-500/10 text-teal-650 dark:text-teal-400'
                              : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400'
                          }`}>
                            {item.type}
                          </span>
                          
                          <Link
                            href={`/products/${item.id}`}
                            className="block text-sm font-extrabold text-zinc-900 dark:text-zinc-50 hover:text-purple-650 dark:hover:text-purple-400 transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 block mt-0.5 font-medium">
                            Sold by {item.vendorName}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Controls & Price Section */}
                      <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10">
                        {/* Quantity Selector */}
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

                        {/* Pricing details */}
                        <div className="text-right flex flex-col justify-center min-w-[90px]">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">
                            {formatPrice(item.price)} each
                          </span>
                          <span className="text-sm font-extrabold font-mono text-zinc-955 dark:text-zinc-50 mt-0.5">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>

                        {/* Remove Action */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-zinc-400 hover:text-red-500 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-200">{formatPrice(cartTotal)}</span>
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
                      Add {formatPrice(5000 - cartTotal)} more for free shipping!
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
                        {vendorCount > 1 && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-500/5 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2">
                            Your cart includes items from {vendorCount} vendors. Only fulfillment and payment methods enabled by every vendor are shown. Store pickup is not available for multi-vendor carts.
                            {multiVendorPendingPaymentBlocked && (
                              <> Bank transfer and cash on delivery require a single-vendor cart — remove items from other vendors or place separate orders.</>
                            )}
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
                              ? 'No shared fulfillment methods are enabled across all vendors in your cart. Remove items from some vendors or ask them to enable matching options.'
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
                                ? 'No shared payment methods are enabled across all vendors in your cart.'
                                : 'No payment methods are enabled for this vendor. Contact the store or try again later.'}
                          </p>
                        ) : null}

                        {multiVendorPendingPaymentBlocked && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                            Bank transfer and cash on delivery are unavailable for multi-vendor carts. Remove items from other vendors or place separate orders.
                          </p>
                        )}

                        {bankTransferSelected && (
                          <div className="space-y-2">
                            {bankTransferMissingDetails ? (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                                Bank transfer cannot be completed until all vendors configure their bank account details.
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
                        optionsLoading ||
                        !!optionsError ||
                        !selectedFulfillment ||
                      !selectedPayment ||
                      bankTransferMissingDetails ||
                      multiVendorPendingPaymentBlocked ||
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
                        <span>Proceed to Checkout</span>
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
