import type { BankTransferCheckoutInstructions } from "@/features/billing/bank-transfer";

export const CHECKOUT_SUCCESS_STORAGE_KEY = "dilnova_checkout_success";

export interface CheckoutSuccessSnapshot {
  orderId: string;
  confirmedOrderEmail: string;
  bankTransferInstructions: BankTransferCheckoutInstructions | null;
  confirmationEmailSent: boolean;
  savedAt: number;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveCheckoutSuccessSnapshot(snapshot: Omit<CheckoutSuccessSnapshot, "savedAt">) {
  if (typeof window === "undefined") return;

  const payload: CheckoutSuccessSnapshot = {
    ...snapshot,
    savedAt: Date.now(),
  };

  sessionStorage.setItem(CHECKOUT_SUCCESS_STORAGE_KEY, JSON.stringify(payload));
}

export function loadCheckoutSuccessSnapshot(): CheckoutSuccessSnapshot | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(CHECKOUT_SUCCESS_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CheckoutSuccessSnapshot;
    if (!parsed.orderId || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(CHECKOUT_SUCCESS_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(CHECKOUT_SUCCESS_STORAGE_KEY);
    return null;
  }
}

export function clearCheckoutSuccessSnapshot() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHECKOUT_SUCCESS_STORAGE_KEY);
}
