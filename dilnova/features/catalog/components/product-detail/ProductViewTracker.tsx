'use client';

import { useEffect, useRef } from 'react';
import { incrementProductViewsAction } from '@/features/catalog/product-detail.actions';

interface ProductViewTrackerProps {
  productId: string;
}

/**
 * Client-side helper component that asynchronously triggers the product views counter server action
 * exactly once after initial hydration. This avoids executing database writes (mutations) during
 * the server-side rendering flow (RSC).
 */
export default function ProductViewTracker({ productId }: ProductViewTrackerProps) {
  const incremented = useRef(false);

  useEffect(() => {
    if (incremented.current) return;
    incremented.current = true;

    incrementProductViewsAction(productId).catch((err) => {
      // Silently catch error to prevent degrading the user experience
      console.warn('[View Tracker] Failed to trigger views increment:', err);
    });
  }, [productId]);

  return null;
}
