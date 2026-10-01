import { useState, useEffect, useCallback } from "react";
import {
  clearCheckoutSuccessSnapshot,
  loadCheckoutSuccessSnapshot,
} from "@/features/cart/checkout-success-storage";
import { type BankTransferCheckoutInstructions } from "@/features/billing/bank-transfer";

export function useCheckoutState() {
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success" | string>(
    "idle",
  );
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success">("idle");
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "";
  });

  const [confirmedOrderEmail, setConfirmedOrderEmail] = useState("");
  const [confirmedOrderId, setConfirmedOrderId] = useState("");
  const [bankTransferInstructions, setBankTransferInstructions] =
    useState<BankTransferCheckoutInstructions | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  const resetIdempotencyKey = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    if (
      !idempotencyKey &&
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [idempotencyKey]);

  useEffect(() => {
    const saved = loadCheckoutSuccessSnapshot();
    if (!saved) return;

    setConfirmedOrderEmail(saved.confirmedOrderEmail);
    setConfirmedOrderId(saved.orderId);
    setBankTransferInstructions(saved.bankTransferInstructions);
    setConfirmationEmailSent(saved.confirmationEmailSent);
    setCheckoutStatus("success");

    clearCheckoutSuccessSnapshot();
  }, []);

  return {
    checkoutStatus,
    setCheckoutStatus,
    emailStatus,
    setEmailStatus,
    idempotencyKey,
    resetIdempotencyKey,
    confirmedOrderEmail,
    setConfirmedOrderEmail,
    confirmedOrderId,
    setConfirmedOrderId,
    bankTransferInstructions,
    setBankTransferInstructions,
    confirmationEmailSent,
    setConfirmationEmailSent,
  };
}
