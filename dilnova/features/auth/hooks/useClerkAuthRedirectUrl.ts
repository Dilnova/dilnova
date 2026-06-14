'use client';

import { usePathname } from 'next/navigation';
import { useCart } from '@/features/cart/context/CartContext';

/**
 * After sign-in/up, send shoppers with items to /cart; otherwise return to the current page.
 */
export function useClerkAuthRedirectUrl(): string | undefined {
  const pathname = usePathname();
  const { cartCount, isCartReady } = useCart();

  if (isCartReady && cartCount > 0) {
    return '/cart';
  }

  if (pathname && pathname !== '/') {
    return pathname;
  }

  return undefined;
}
