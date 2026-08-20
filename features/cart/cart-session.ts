import type { SyncedCartItem } from "@/features/cart/schema";

export type CartAccountKey = "guest" | `user:${string}`;

export function getCartAccountKey(
  isSignedIn: boolean,
  userId: string | null | undefined,
): CartAccountKey {
  if (isSignedIn && userId) {
    return `user:${userId}`;
  }
  return "guest";
}

export function mergeCartItems(
  local: SyncedCartItem[],
  remote: SyncedCartItem[],
): SyncedCartItem[] {
  const byId = new Map<string, SyncedCartItem>();

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

export function applyCatalogSync(
  items: SyncedCartItem[],
  updates: {
    id: string;
    name: string;
    price: number;
    weightGrams?: number | null;
    stockQuantity?: number | null;
    stockStatus?: string | null;
  }[],
  removedIds: string[],
): SyncedCartItem[] {
  const removedSet = new Set(removedIds);
  const updateById = new Map(updates.map((item) => [item.id, item]));

  let hasChanged = false;
  const filtered: SyncedCartItem[] = [];

  for (const item of items) {
    if (removedSet.has(item.id)) {
      hasChanged = true;
    } else {
      filtered.push(item);
    }
  }

  const nextItems = filtered.map((item) => {
    const update = updateById.get(item.id);
    if (!update) return item;

    const nextWeight = update.weightGrams !== undefined ? update.weightGrams : item.weightGrams;
    const nextStockQuantity =
      update.stockQuantity !== undefined ? update.stockQuantity : item.stockQuantity;
    const nextStockStatus =
      update.stockStatus !== undefined ? update.stockStatus : item.stockStatus;

    if (
      item.name === update.name &&
      item.price === update.price &&
      item.weightGrams === nextWeight &&
      item.stockQuantity === nextStockQuantity &&
      item.stockStatus === nextStockStatus
    ) {
      return item;
    }

    hasChanged = true;
    return {
      ...item,
      name: update.name,
      price: update.price,
      weightGrams: nextWeight,
      stockQuantity: nextStockQuantity,
      stockStatus: nextStockStatus,
    };
  });

  if (!hasChanged) {
    return items;
  }

  return nextItems;
}

export function buildCartMergeNotice(
  previousCount: number,
  nextCount: number,
  removedCount: number,
): string | null {
  if (nextCount <= 0) {
    if (removedCount > 0) {
      return "Some unavailable items were removed from your cart during sync.";
    }
    return null;
  }

  if (removedCount > 0) {
    return `Cart synced — ${nextCount} item${nextCount === 1 ? "" : "s"} ready (${removedCount} unavailable item${removedCount === 1 ? "" : "s"} removed).`;
  }

  if (previousCount === 0) {
    return `Cart restored — ${nextCount} item${nextCount === 1 ? "" : "s"} ready for checkout.`;
  }

  return `Cart synced — ${nextCount} item${nextCount === 1 ? "" : "s"} ready for checkout.`;
}

export function countCartLines(items: SyncedCartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
