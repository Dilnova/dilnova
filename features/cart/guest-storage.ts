import { cartLineSchema, type SyncedCartItem } from "@/features/cart/schema";

export const GUEST_CART_STORAGE_KEY = "dilnova_cart";

export interface GuestCartSnapshotItem {
  id: string;
  quantity: number;
}

function parseGuestCartSnapshot(raw: string | null): GuestCartSnapshotItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is GuestCartSnapshotItem =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as GuestCartSnapshotItem).id === "string" &&
          typeof (item as GuestCartSnapshotItem).quantity === "number" &&
          (item as GuestCartSnapshotItem).quantity > 0,
      )
      .map((item) => ({ id: item.id, quantity: item.quantity }));
  } catch {
    return [];
  }
}

function parseGuestCartItems(raw: string | null): SyncedCartItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const items: SyncedCartItem[] = [];
    for (const entry of parsed) {
      const result = cartLineSchema.safeParse(entry);
      if (result.success) {
        items.push(result.data);
      }
    }
    return items;
  } catch {
    return [];
  }
}

export function readGuestCartFromStorage(): SyncedCartItem[] {
  if (typeof globalThis.localStorage === "undefined") return [];
  return parseGuestCartItems(globalThis.localStorage.getItem(GUEST_CART_STORAGE_KEY));
}

export function writeGuestCartToStorage(items: SyncedCartItem[]): void {
  if (typeof globalThis.localStorage === "undefined") return;
  globalThis.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
}

export function clearGuestCartStorage(): void {
  if (typeof globalThis.localStorage === "undefined") return;
  globalThis.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
}

export function getGuestCartLineCount(): number {
  return readGuestCartFromStorage().reduce((sum, item) => sum + item.quantity, 0);
}

export function guestCartHasItems(): boolean {
  return getGuestCartLineCount() > 0;
}

/** @deprecated Use readGuestCartFromStorage — kept for snapshot-only callers. */
export function readGuestCartSnapshotFromStorage(): GuestCartSnapshotItem[] {
  if (typeof globalThis.localStorage === "undefined") return [];
  return parseGuestCartSnapshot(globalThis.localStorage.getItem(GUEST_CART_STORAGE_KEY));
}
