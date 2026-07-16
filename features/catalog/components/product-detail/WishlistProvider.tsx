'use client';

import React, { createContext, useContext, useMemo } from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { getUserWishlistIdsAction } from '@/features/catalog/product-detail.actions';

export const WishlistContext = createContext<Set<string> | null>(null);

export function WishlistProvider({ productIds, children }: { productIds: string[], children: React.ReactNode }) {
  const { userId } = useAuth();
  
  const { data: wishlistedIds } = useSWR(
    userId && productIds.length > 0 ? ['wishlist', productIds] : null,
    ([, ids]) => getUserWishlistIdsAction(ids as string[])
  );

  const wishlistSet = useMemo(() => new Set(wishlistedIds || []), [wishlistedIds]);

  return (
    <WishlistContext.Provider value={wishlistSet}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlistSet() {
  return useContext(WishlistContext);
}
