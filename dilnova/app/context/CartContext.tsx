'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  loadCustomerCartAction,
  saveCustomerCartAction,
  type SyncedCartItem,
} from '@/app/cart/cartSyncActions';
import { syncCartPricesAction } from '@/app/cart/actions';
import { GUEST_CART_STORAGE_KEY } from '@/utils/guestCartStorage';

export interface CartItem {
  id: string;
  name: string;
  price: number; // in cents
  imageUrl: string | null;
  quantity: number;
  vendorName: string;
  type: string; // 'product' | 'service'
}

interface CartContextType {
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

const CartContext = createContext<CartContextType | undefined>(undefined);

function mergeCartItems(local: CartItem[], remote: SyncedCartItem[]): CartItem[] {
  const byId = new Map<string, CartItem>();

  for (const item of remote) {
    byId.set(item.id, { ...item });
  }

  for (const item of local) {
    const existing = byId.get(item.id);
    if (existing) {
      byId.set(item.id, {
        ...existing,
        ...item,
        quantity: Math.max(existing.quantity, item.quantity),
      });
    } else {
      byId.set(item.id, { ...item });
    }
  }

  return [...byId.values()];
}

function applyCatalogSync(
  items: CartItem[],
  updates: { id: string; name: string; price: number }[],
  removedIds: string[]
): CartItem[] {
  const removedSet = new Set(removedIds);
  const updateById = new Map(updates.map((item) => [item.id, item]));

  return items
    .filter((item) => !removedSet.has(item.id))
    .map((item) => {
      const update = updateById.get(item.id);
      if (!update) return item;
      return { ...item, name: update.name, price: update.price };
    });
}

function buildCartMergeNotice(
  previousCount: number,
  nextCount: number,
  removedCount: number
): string | null {
  if (nextCount <= 0) {
    if (removedCount > 0) {
      return 'Some unavailable items were removed from your cart during sync.';
    }
    return null;
  }

  if (removedCount > 0) {
    return `Cart synced — ${nextCount} item${nextCount === 1 ? '' : 's'} ready (${removedCount} unavailable item${removedCount === 1 ? '' : 's'} removed).`;
  }

  if (previousCount === 0) {
    return `Cart restored — ${nextCount} item${nextCount === 1 ? '' : 's'} ready for checkout.`;
  }

  return `Cart synced — ${nextCount} item${nextCount === 1 ? '' : 's'} ready for checkout.`;
}

function countCartLines(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartReady, setIsCartReady] = useState(false);
  const [serverMerged, setServerMerged] = useState(false);
  const [cartMergeNotice, setCartMergeNotice] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const cartItemsRef = useRef<CartItem[]>([]);

  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[];
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to parse cart items', error);
    } finally {
      setIsCartReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isCartReady) return;
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems, isCartReady]);

  useEffect(() => {
    if (!isCartReady || !isSignedIn || serverMerged) return;

    let cancelled = false;

    const mergeSignedInCart = async () => {
      const localSnapshot = cartItemsRef.current;
      const previousLineCount = countCartLines(localSnapshot);

      const result = await loadCustomerCartAction();
      if (cancelled) return;

      if (!result.success) {
        setServerMerged(true);
        return;
      }

      let merged = mergeCartItems(localSnapshot, result.items || []);

      const syncResult = await syncCartPricesAction(merged.map((item) => item.id));
      if (cancelled) return;

      let removedCount = 0;
      if (syncResult.success) {
        removedCount = syncResult.removedIds.length;
        merged = applyCatalogSync(merged, syncResult.items, syncResult.removedIds);
      }

      const nextLineCount = countCartLines(merged);
      setCartItems(merged);
      setCartMergeNotice(buildCartMergeNotice(previousLineCount, nextLineCount, removedCount));
      setServerMerged(true);

      if (merged.length > 0) {
        await saveCustomerCartAction(merged);
      }
    };

    void mergeSignedInCart();

    return () => {
      cancelled = true;
    };
  }, [isCartReady, isSignedIn, serverMerged]);

  const persistServerCart = useCallback(
    (items: CartItem[]) => {
      if (!isSignedIn) return;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        void saveCustomerCartAction(items);
      }, 600);
    },
    [isSignedIn]
  );

  useEffect(() => {
    if (!isCartReady || !isSignedIn || !serverMerged) return;
    persistServerCart(cartItems);
  }, [cartItems, isCartReady, isSignedIn, serverMerged, persistServerCart]);

  useEffect(() => {
    if (!isSignedIn) {
      setServerMerged(false);
    }
  }, [isSignedIn]);

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prevItems, { ...item, quantity }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const removeItemsByIds = (ids: string[]) => {
    const idSet = new Set(ids);
    setCartItems((prevItems) => prevItems.filter((item) => !idSet.has(item.id)));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setCartMergeNotice(null);
    if (isSignedIn) {
      void saveCustomerCartAction([]);
    }
  };

  const syncCartPrices = (
    updates: { id: string; name: string; price: number }[],
    removedIds: string[] = []
  ) => {
    setCartItems((prevItems) => applyCatalogSync(prevItems, updates, removedIds));
  };

  const clearCartMergeNotice = () => setCartMergeNotice(null);

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = countCartLines(cartItems);

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
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
