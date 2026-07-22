"use client";

import { useState } from "react";
import { useCart } from "@/features/cart/context/cart-context";

interface ProductDetailAddToCartProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    vendorName: string;
    type: string;
  };
  canPurchase?: boolean;
  stockLabel?: string;
}

export default function ProductDetailAddToCart({
  product,
  canPurchase = true,
  stockLabel,
}: ProductDetailAddToCartProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setQuantity(1); // Reset quantity to 1 after adding
    }, 1500);
  };

  if (!canPurchase) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled
          className="w-full h-10 flex items-center justify-center text-xs font-mono font-bold uppercase tracking-wider rounded-xl bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed"
        >
          {stockLabel ? `${stockLabel} — Cannot Add to Cart` : "Currently Unavailable"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
      {/* Quantity Selector */}
      <div className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 h-10 px-1 sm:w-32">
        <button
          onClick={handleDecrement}
          className="w-8 h-8 flex items-center justify-center text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer"
          aria-label="Decrease quantity"
        >
          -
        </button>
        <span className="px-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 select-none">
          {quantity}
        </span>
        <button
          onClick={handleIncrement}
          className="w-8 h-8 flex items-center justify-center text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Add To Cart Button */}
      <button
        onClick={handleAddToCart}
        className={`flex-1 h-10 flex items-center justify-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-md ${
          added
            ? "bg-emerald-605 bg-emerald-650 text-white shadow-emerald-900/10"
            : "bg-purple-700 hover:bg-purple-800 text-white shadow-purple-900/10 cursor-pointer"
        }`}
      >
        {added ? (
          <>
            <span>
              Added {quantity} Item{quantity > 1 ? "s" : ""}!
            </span>
            <span className="font-sans">✓</span>
          </>
        ) : (
          <>
            <span>🛒</span>
            <span>Add to Cart</span>
          </>
        )}
      </button>
    </div>
  );
}
