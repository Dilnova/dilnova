'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  loadCustomerCartAction,
  saveCustomerCartAction,
} from '@/features/cart/sync.actions';
import type { SyncedCartItem } from '@/features/cart/schema';
import { syncCartPricesAction } from '@/features/cart/checkout.actions';
import {
  clearGuestCartStorage,
  readGuestCartFromStorage,
  writeGuestCartToStorage,
} from '@/features/cart/guest-storage';
import {
  applyCatalogSync,
  buildCartMergeNotice,
  countCartLines,
  getCartAccountKey,
  mergeCartItems,
  type CartAccountKey,
} from '@/features/cart/cart-session';
import type { CartItem } from '@/features/cart/types';

export type { CartItem };

export interface CartContextType {
  cartItems: CartItem[];
  isCartReady: boolean;
  cartMergeNotice: string | null;
  clearCartMergeNotice: () => void;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  removeItemsByIds: (ids: string[]) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  syncCartPrices: (
    updates: { id: string; name: string; price: number }[],
    removedIds?: string[]
  ) => void;
  cartTotal: number;
  cartCount: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const accountKey = getCartAccountKey(Boolean(isSignedIn), userId);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartReady, setIsCartReady] = useState(false);
  const [serverSynced, setServerSynced] = useState(false);
  const [cartMergeNotice, setCartMergeNotice] = useState<string | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const cartItemsRef = useRef<CartItem[]>([]);
  const activeAccountKeyRef = useRef<CartAccountKey | null>(null);
  const hydrateRequestRef = useRef(0);
  const isHydratingRef = useRef(false);

  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // Load the correct cart whenever Clerk account changes (guest ↔ user, or user A ↔ user B).
  useEffect(() => {
    if (!isLoaded) return;

    const previousAccountKey = activeAccountKeyRef.current;
    if (previousAccountKey === accountKey) return;

    const wasGuest = previousAccountKey === 'guest';
    const isGuest = accountKey === 'guest';
    activeAccountKeyRef.current = accountKey;

    const requestId = ++hydrateRequestRef.current;
    setServerSynced(false);
    setCartMergeNotice(null);
    setIsCartReady(false);

    if (isGuest) {
      setCartItems(readGuestCartFromStorage());
      setIsCartReady(true);
      return;
    }

    // Signed-in: never reuse in-memory items from a previous account.
    setCartItems([]);

    const guestItemsForMerge = wasGuest ? readGuestCartFromStorage() : [];
    if (wasGuest) {
      clearGuestCartStorage();
    }

    void (async () => {
      const previousLineCount = countCartLines(guestItemsForMerge);

      const result = await loadCustomerCartAction();
      if (hydrateRequestRef.current !== requestId) return;

      if (!result.success) {
        setCartItems(guestItemsForMerge);
        setIsCartReady(true);
        setServerSynced(true);
        return;
      }

      let merged = mergeCartItems(guestItemsForMerge, result.items || []);

      const syncResult = await syncCartPricesAction(merged.map((item) => item.id));
      if (hydrateRequestRef.current !== requestId) return;

      let removedCount = 0;
      if (syncResult.success) {
        removedCount = syncResult.removedIds.length;
        merged = applyCatalogSync(merged, syncResult.items, syncResult.removedIds);
      }

      const nextLineCount = countCartLines(merged);
      
      isHydratingRef.current = true;
      setCartItems(merged);
      setCartMergeNotice(buildCartMergeNotice(previousLineCount, nextLineCount, removedCount));
      setServerSynced(true);
      setIsCartReady(true);

      if (merged.length > 0 && (guestItemsForMerge.length > 0 || removedCount > 0 || (syncResult.success && syncResult.items.length > 0))) {
        await saveCustomerCartAction(merged);
      }
    })();
  }, [accountKey, isLoaded]);

  // Guest carts only: persist to localStorage. Signed-in carts persist to PostgreSQL only.
  useEffect(() => {
    if (!isCartReady || accountKey !== 'guest') return;
    writeGuestCartToStorage(cartItems);
  }, [cartItems, isCartReady, accountKey]);

  const persistServerCart = useCallback(
    (items: SyncedCartItem[]) => {
      if (accountKey === 'guest' || !serverSynced) return;

      if (isHydratingRef.current) {
        isHydratingRef.current = false;
        return;
      }

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        void saveCustomerCartAction(items);
      }, 600);
    },
    [accountKey, serverSynced]
  );

  useEffect(() => {
    if (!isCartReady || accountKey === 'guest' || !serverSynced) return;
    persistServerCart(cartItems);
  }, [cartItems, isCartReady, accountKey, serverSynced, persistServerCart]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prevItems, { ...item, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const removeItemsByIds = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setCartItems((prevItems) => prevItems.filter((item) => !idSet.has(item.id)));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCartMergeNotice(null);
    if (accountKey === 'guest') {
      clearGuestCartStorage();
    } else {
      void saveCustomerCartAction([]);
    }
  }, [accountKey]);

  const syncCartPrices = useCallback((
    updates: { id: string; name: string; price: number }[],
    removedIds: string[] = []
  ) => {
    setCartItems((prevItems) => applyCatalogSync(prevItems, updates, removedIds));
  }, []);

  const clearCartMergeNotice = useCallback(() => setCartMergeNotice(null), []);

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = countCartLines(cartItems);

  const contextValue = React.useMemo(() => ({
    cartItems,
    isCartReady,
    cartMergeNotice,
    clearCartMergeNotice,
    addToCart,
    removeFromCart,
    removeItemsByIds,
    updateQuantity,
    clearCart,
    syncCartPrices,
    cartTotal,
    cartCount,
  }), [
    cartItems,
    isCartReady,
    cartMergeNotice,
    clearCartMergeNotice,
    addToCart,
    removeFromCart,
    removeItemsByIds,
    updateQuantity,
    clearCart,
    syncCartPrices,
    cartTotal,
    cartCount,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
