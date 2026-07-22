import { useState, useEffect } from "react";
import {
  clearCheckoutSuccessSnapshot,
  loadCheckoutSuccessSnapshot,
} from "@/features/cart/checkout-success-storage";
import { type BankTransferCheckoutInstructions } from "@/features/billing/bank-transfer";

export function useCheckoutState() {
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success">("idle");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  const [confirmedOrderEmail, setConfirmedOrderEmail] = useState("");
  const [confirmedOrderId, setConfirmedOrderId] = useState("");
  const [bankTransferInstructions, setBankTransferInstructions] =
    useState<BankTransferCheckoutInstructions | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

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
