"use client";

import React from "react";
import { playAudioFeedback } from "../../utils/pos-audio";
import { usePOSContext } from "../POSBillingProvider";

interface TicketPanelProps {
  isMobileSheet?: boolean;
}

export default function POSTicketPanel({ isMobileSheet = false }: TicketPanelProps) {
  const {
    cart,
    setCart,
    totalItemCount,
    updateCartQty,
    removeCartItem,
    discountPercent,
    setDiscountPercent,
    subtotalAmount,
    discountAmount,
    totalAmount,
    customerName,
    setCustomerName,
    paymentMethod,
    setPaymentMethod,
    cashTendered,
    setCashTendered,
    cashTenderedVal,
    changeDue,
    notes,
    setNotes,
    handlePOSCheckout,
    isPending,
    setIsMobileCartOpen,
  } = usePOSContext();

  return (
    <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden">
      {/* Pinned Ticket Top Header & Scrollable Items Container */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-xs tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
              Checkout Ticket
            </h3>
            {totalItemCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setDiscountPercent(0);
                playAudioFeedback("error");
              }}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Ticket
            </button>
          )}
        </div>

        {/* Cart Item List - ONLY THIS ELEMENT HAS OVERFLOW SCROLL */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {cart.map((item) => (
            <div
              key={item.product.productId}
              className="flex justify-between items-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 text-xs shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block truncate">
                  {item.product.productName}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                  <span>${((item.product.productPrice ?? 0) / 100).toFixed(2)} ea</span>
                  <span>•</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    ${((item.quantity * (item.product.productPrice ?? 0)) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => updateCartQty(item.product.productId, item.quantity - 1)}
                  className="w-6 h-6 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 active:scale-95 cursor-pointer shadow-2xs"
                  aria-label="Decrease quantity"
                >
                  -
                </button>

                <span className="w-6 text-center font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() => updateCartQty(item.product.productId, item.quantity + 1)}
                  className="w-6 h-6 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 active:scale-95 cursor-pointer shadow-2xs"
                  aria-label="Increase quantity"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => removeCartItem(item.product.productId)}
                  className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-xs font-bold cursor-pointer ml-0.5"
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="text-center py-8 text-zinc-400 font-mono text-xs space-y-1">
              <p className="text-xl">🛒</p>
              <p>Ticket is empty</p>
              <p className="text-[10px] text-zinc-400">Scan barcode or select products to add</p>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Fixed Ticket Footer & Payment Controls */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-2 flex-shrink-0">
        {/* Quick Discount Selector */}
        {cart.length > 0 && (
          <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Discount:
            </span>
            <div className="flex gap-1">
              {[0, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    discountPercent === pct
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200"
                  }`}
                >
                  {pct === 0 ? "None" : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="space-y-0.5 text-xs">
          {discountPercent > 0 && (
            <div className="flex justify-between text-zinc-500 text-[11px]">
              <span>Subtotal:</span>
              <span className="font-mono">${subtotalAmount.toFixed(2)}</span>
            </div>
          )}
          {discountPercent > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
              <span>Discount ({discountPercent}%):</span>
              <span className="font-mono">-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-0.5">
            <span className="text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-extrabold text-[11px]">
              Total Due:
            </span>
            <span className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ${totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name (Optional)"
            className="w-full px-2.5 py-1 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 focus:outline-none"
          />

          <div className="grid grid-cols-3 gap-1">
            {(["cash", "card", "other"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  paymentMethod === method
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {method === "cash" ? "💵 Cash" : method === "card" ? "💳 Card" : "⭐ Other"}
              </button>
            ))}
          </div>

          {/* Cash Tendered & Change Calculator */}
          {paymentMethod === "cash" && (
            <div className="p-1.5 rounded-xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300 text-[10px]">
                  Tendered:
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={`$${totalAmount.toFixed(2)}`}
                  className="w-20 px-2 py-0.5 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-right font-mono font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              {/* Quick Cash Preset Buttons */}
              <div className="flex gap-1">
                {[10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt.toString())}
                    className="flex-1 py-0.5 rounded bg-white dark:bg-zinc-900 border border-amber-300/60 dark:border-amber-800 text-[10px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 cursor-pointer"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashTendered(totalAmount.toFixed(2))}
                  className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-amber-300/60 dark:border-amber-800 text-[10px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 cursor-pointer"
                >
                  Exact
                </button>
              </div>

              {cashTenderedVal > 0 && (
                <div className="flex justify-between items-center text-xs pt-0.5 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="font-bold text-amber-950 dark:text-amber-200 text-[10px]">
                    Change Due:
                  </span>
                  <span
                    className={`font-mono font-black text-xs ${
                      cashTenderedVal >= totalAmount
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    ${changeDue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Receipt checkout notes..."
            rows={1}
            className="w-full px-2.5 py-1 border border-zinc-200 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 resize-none focus:outline-none"
          />
        </div>

        <button
          onClick={() => handlePOSCheckout(() => isMobileSheet && setIsMobileCartOpen(false))}
          disabled={cart.length === 0 || isPending}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isPending ? (
            <span>Processing...</span>
          ) : (
            <span>✓ Complete Checkout (${totalAmount.toFixed(2)})</span>
          )}
        </button>
      </div>
    </div>
  );
}
