'use client';

import Link from 'next/link';
import { useCart } from '@/features/cart/context/CartContext';

export default function CartIcon() {
  const { cartCount } = useCart();

  return (
    <Link
      href="/cart"
      className="relative p-2 rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 focus:outline-none transition-all flex items-center justify-center cursor-pointer"
      aria-label="Open Shopping Cart"
    >
      <span className="text-xl">🛒</span>
      {cartCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white font-mono text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 animate-pulse">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
