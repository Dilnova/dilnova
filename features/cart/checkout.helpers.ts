import type { CheckoutItemInput } from "@/features/cart/schema";

export function aggregateCheckoutItems(items: CheckoutItemInput[]): CheckoutItemInput[] {
  const byId = new Map<string, CheckoutItemInput>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (existing) {
      byId.set(item.id, { ...existing, quantity: existing.quantity + item.quantity });
    } else {
      byId.set(item.id, { ...item });
    }
  }
  return [...byId.values()];
}

export type CheckoutTransactionResult =
  | { success: false; error: string }
  | {
      success: true;
      orderId: string;
      grandTotalCents: number;
      vendorSubtotals: Record<string, number>;
      serverSubtotalCents: number;
    };
