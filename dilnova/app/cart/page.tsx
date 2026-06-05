'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useCart } from '../context/CartContext';
import { isVideoUrl } from '@/utils/media';
import { sendCartSummaryEmailAction, simulatedCheckoutAction } from './actions';

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
  } = useCart();

  const router = useRouter();
  const { isSignedIn, user } = useUser();

  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    router.back();
  };

  const handleSendInbox = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = isSignedIn ? user?.primaryEmailAddress?.emailAddress : emailInput;
    if (!targetEmail) return;

    setEmailStatus('sending');
    try {
      const res = await sendCartSummaryEmailAction(targetEmail, cartItems, cartTotal);
      if (res.success) {
        setEmailStatus('success');
        setEmailMessage(`Cart list successfully sent to ${targetEmail}!`);
        setTimeout(() => {
          setEmailStatus('idle');
          setEmailInput('');
        }, 4000);
      } else {
        setEmailStatus('idle');
        alert(res.error || 'Failed to send email.');
      }
    } catch (err: unknown) {
      setEmailStatus('idle');
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      alert(errMsg);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const handleCheckout = async () => {
    setCheckoutStatus('processing');
    setCheckoutError(null);

    // Determine customer info
    const customerName = isSignedIn
      ? (user?.fullName || user?.firstName || 'Customer')
      : 'Guest Customer';
    const customerEmail = isSignedIn
      ? (user?.primaryEmailAddress?.emailAddress || 'guest@unknown.com')
      : emailInput || 'guest@unknown.com';

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
        cartTotal
      );

      if (result.success) {
        setCheckoutStatus('success');
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
    clearCart();
    setCheckoutStatus('idle');
  };

  // Calculations
  const taxRate = 0.08; // 8% estimated tax
  const estimatedTax = cartTotal * taxRate;
  const shippingFee = cartTotal > 5000 ? 0 : 500; // Free shipping over $50.00, otherwise $5.00
  const grandTotal = cartTotal + estimatedTax + shippingFee;

  if (checkoutStatus === 'success') {
    return (
      <main className="min-h-[80vh] flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
        <div className="max-w-md w-full border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 bg-white dark:bg-zinc-900 shadow-xl text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 text-3xl animate-bounce">
            ✓
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Order Confirmed!</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-450">
              Thank you for your purchase. We are simulating a successful payment and order placement.
            </p>
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-850 pt-6">
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
        {cartItems.length === 0 ? (
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

                <div className="pt-2 space-y-3">
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutStatus === 'processing'}
                    className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-purple-900/10 transition-all cursor-pointer flex items-center justify-center gap-2"
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
                ) : (
                  <form onSubmit={handleSendInbox} className="space-y-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-450 leading-relaxed">
                      {isSignedIn 
                        ? `Email the list of these ${cartCount} items to your registered address.`
                        : "Enter your email address to receive a summary copy of your shopping cart."
                      }
                    </p>
                    
                    {!isSignedIn && (
                      <input
                        type="email"
                        required
                        placeholder="your-email@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                      />
                    )}
                    
                    {isSignedIn && (
                      <div className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900 truncate">
                        📧 {user?.primaryEmailAddress?.emailAddress}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={emailStatus === 'sending'}
                      className="w-full text-center py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
