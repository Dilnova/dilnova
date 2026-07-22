"use client";

import { useCart } from "@/features/cart/context/cart-context";

export default function CartCountBadge() {
  const { cartCount } = useCart();

  if (cartCount === 0) return null;

  return (
    <span className="text-xs font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 px-3 py-1 rounded-full">
      {cartCount} {cartCount === 1 ? "item" : "items"}
    </span>
  );
}
