export const BANK_TRANSFER_PAYMENT_ID = "bank_transfer";

export interface BankTransferDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  instructions: string;
}

export interface BankTransferVendorInstruction {
  orgId: string;
  vendorName: string;
  amountCents: number;
  bankDetails: BankTransferDetails | null;
}

export interface BankTransferCheckoutInstructions {
  orderId: string;
  reference: string;
  grandTotalCents: number;
  vendors: BankTransferVendorInstruction[];
}

/** Safe pre-checkout payload — no account numbers exposed before an order exists */
export interface VendorBankTransferAvailability {
  vendorName: string;
  configured: boolean;
}

export function toVendorBankTransferAvailability(input: {
  vendorName: string;
  bankDetails: BankTransferDetails | null;
}): VendorBankTransferAvailability {
  return {
    vendorName: input.vendorName,
    configured: hasCompleteBankDetails(input.bankDetails),
  };
}

export function isBankTransferPayment(paymentMethodId: string): boolean {
  return paymentMethodId === BANK_TRANSFER_PAYMENT_ID;
}

export function formatBankTransferReference(orderId: string): string {
  return `ORD-${orderId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export function parseBankTransferDetailsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): BankTransferDetails | null {
  if (!metadata) return null;

  const bankName = typeof metadata.bankName === "string" ? metadata.bankName.trim() : "";
  const accountName =
    typeof metadata.bankAccountName === "string" ? metadata.bankAccountName.trim() : "";
  const accountNumber =
    typeof metadata.bankAccountNumber === "string" ? metadata.bankAccountNumber.trim() : "";
  const branchCode =
    typeof metadata.bankBranchCode === "string" ? metadata.bankBranchCode.trim() : "";
  const instructions =
    typeof metadata.bankTransferInstructions === "string"
      ? metadata.bankTransferInstructions.trim()
      : "";

  if (!bankName || !accountName || !accountNumber) {
    return null;
  }

  return {
    bankName,
    accountName,
    accountNumber,
    branchCode,
    instructions,
  };
}

export function hasCompleteBankDetails(details: BankTransferDetails | null | undefined): boolean {
  return Boolean(details?.bankName && details?.accountName && details?.accountNumber);
}

/** Split grand total across vendors proportionally by line subtotal (tax/shipping included). */
export function allocateVendorPaymentAmounts(
  vendorSubtotals: Record<string, number>,
  serverSubtotalCents: number,
  grandTotalCents: number,
): { orgId: string; amountCents: number }[] {
  const entries = Object.entries(vendorSubtotals);
  if (entries.length === 0) return [];

  if (serverSubtotalCents <= 0) {
    const evenShare = Math.floor(grandTotalCents / entries.length);
    return entries.map(([orgId], index) => ({
      orgId,
      amountCents:
        index === entries.length - 1
          ? grandTotalCents - evenShare * (entries.length - 1)
          : evenShare,
    }));
  }

  let allocated = 0;
  return entries.map(([orgId, subtotal], index) => {
    if (index === entries.length - 1) {
      return { orgId, amountCents: grandTotalCents - allocated };
    }
    const amountCents = Math.round((subtotal / serverSubtotalCents) * grandTotalCents);
    allocated += amountCents;
    return { orgId, amountCents };
  });
}
