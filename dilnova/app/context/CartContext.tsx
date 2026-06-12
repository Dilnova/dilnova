'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  loadCustomerCartAction,
  saveCustomerCartAction,
  type SyncedCartItem,
} from '@/app/cart/cartSyncActions';

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
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
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
        quantity: existing.quantity + item.quantity,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        vendorName: item.vendorName,
        type: item.type,
      });
    } else {
      byId.set(item.id, { ...item });
    }
  }

  return [...byId.values()];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [serverMerged, setServerMerged] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const savedCart = localStorage.getItem('dilnova_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as CartItem[];
        setCartItems(parsed);
      } catch (e) {
        console.error('Failed to parse cart items', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dilnova_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || serverMerged) return;

    let cancelled = false;

    loadCustomerCartAction().then((result) => {
      if (cancelled || !result.success) {
        if (!cancelled) setServerMerged(true);
        return;
      }

      setCartItems((prev) => mergeCartItems(prev, result.items || []));
      setServerMerged(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, serverMerged]);

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
    if (!isLoaded || !isSignedIn || !serverMerged) return;
    persistServerCart(cartItems);
  }, [cartItems, isLoaded, isSignedIn, serverMerged, persistServerCart]);

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
    if (isSignedIn) {
      void saveCustomerCartAction([]);
    }
  };

  const syncCartPrices = (
    updates: { id: string; name: string; price: number }[],
    removedIds: string[] = []
  ) => {
    const removedSet = new Set(removedIds);
    const updateById = new Map(updates.map((item) => [item.id, item]));

    setCartItems((prevItems) =>
      prevItems
        .filter((item) => !removedSet.has(item.id))
        .map((item) => {
          const update = updateById.get(item.id);
          if (!update) return item;
          return { ...item, name: update.name, price: update.price };
        })
    );
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
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
