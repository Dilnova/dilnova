'use client';

import { useState } from 'react';
import { useCart } from '../context/CartContext';

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    vendorName: string;
    type: string;
  };
  quantity?: number;
  className?: string;
  showLabel?: boolean;
  canPurchase?: boolean;
}

export default function AddToCartButton({
  product,
  quantity = 1,
  className = '',
  showLabel = true,
  canPurchase = true,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  if (!canPurchase) {
    if (!showLabel) {
      return (
        <span
          className={`inline-flex items-center justify-center p-2 h-8 w-8 rounded-lg border text-xs bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 ${className}`}
          title="Unavailable"
        >
          —
        </span>
      );
    }

    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center font-mono font-bold uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-xl bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed ${className}`}
      >
        Unavailable
      </button>
    );
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const baseStyles = 'inline-flex items-center justify-center font-mono font-bold uppercase transition-all duration-200 select-none';

  if (!showLabel) {
    return (
      <button
        onClick={handleAdd}
        className={`${baseStyles} p-2 h-8 w-8 rounded-lg border text-xs shadow-sm ${
          added
            ? 'bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-650'
            : 'bg-white hover:bg-purple-50 border-zinc-200 text-purple-750 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-purple-400'
        } ${className}`}
        title="Add to Cart"
        aria-label="Add to Cart"
      >
        {added ? '✓' : '🛒'}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`${baseStyles} text-[10px] tracking-wider px-4 py-2.5 rounded-xl shadow-md ${
        added
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10'
          : 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-900/10'
      } ${className}`}
    >
      {added ? (
        <span className="flex items-center gap-1">
          <span>Added!</span>
          <span className="font-sans">✓</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <span>🛒</span>
          <span>Add to Cart</span>
        </span>
      )}
    </button>
  );
}
