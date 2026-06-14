export const GUEST_CART_STORAGE_KEY = 'dilnova_cart';

export interface GuestCartSnapshotItem {
  id: string;
  quantity: number;
}

function parseGuestCart(raw: string | null): GuestCartSnapshotItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is GuestCartSnapshotItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as GuestCartSnapshotItem).id === 'string' &&
          typeof (item as GuestCartSnapshotItem).quantity === 'number' &&
          (item as GuestCartSnapshotItem).quantity > 0
      )
      .map((item) => ({ id: item.id, quantity: item.quantity }));
  } catch {
    return [];
  }
}

export function readGuestCartFromStorage(): GuestCartSnapshotItem[] {
  if (typeof globalThis.localStorage === 'undefined') return [];
  return parseGuestCart(globalThis.localStorage.getItem(GUEST_CART_STORAGE_KEY));
}

export function getGuestCartLineCount(): number {
  return readGuestCartFromStorage().reduce((sum, item) => sum + item.quantity, 0);
}

export function guestCartHasItems(): boolean {
  return getGuestCartLineCount() > 0;
}
