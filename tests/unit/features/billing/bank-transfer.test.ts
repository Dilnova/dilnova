import { describe, expect, it } from "vitest";
import {
  allocateVendorPaymentAmounts,
  formatBankTransferReference,
  hasCompleteBankDetails,
  isBankTransferPayment,
  parseBankTransferDetailsFromMetadata,
  toVendorBankTransferAvailability,
} from "@/features/billing/bank-transfer";

describe("bankTransfer utilities", () => {
  it("detects bank transfer payment id", () => {
    expect(isBankTransferPayment("bank_transfer")).toBe(true);
    expect(isBankTransferPayment("pay_online")).toBe(false);
  });

  it("formats payment reference from order id", () => {
    expect(formatBankTransferReference("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBe(
      "ORD-A0EEBC999C0B",
    );
  });

  it("parses complete bank details from org metadata", () => {
    const details = parseBankTransferDetailsFromMetadata({
      bankName: "Commercial Bank",
      bankAccountName: "Dilnova Store",
      bankAccountNumber: "1234567890",
      bankBranchCode: "001",
      bankTransferInstructions: "Use order reference in transfer note.",
    });

    expect(hasCompleteBankDetails(details)).toBe(true);
    expect(details?.bankName).toBe("Commercial Bank");
  });

  it("rejects incomplete bank details", () => {
    expect(
      hasCompleteBankDetails(
        parseBankTransferDetailsFromMetadata({
          bankName: "Commercial Bank",
        }),
      ),
    ).toBe(false);
  });

  it("builds pre-checkout availability without exposing account numbers", () => {
    const availability = toVendorBankTransferAvailability({
      vendorName: "Distar Hardware",
      bankDetails: {
        bankName: "Commercial Bank",
        accountName: "Distar Hardware",
        accountNumber: "1234567890",
        branchCode: "001",
        instructions: "Include order reference.",
      },
    });

    expect(availability).toEqual({
      vendorName: "Distar Hardware",
      configured: true,
    });
    expect(availability).not.toHaveProperty("bankDetails");
    expect(availability).not.toHaveProperty("accountNumber");
  });

  it("allocates grand total across vendors proportionally", () => {
    const allocations = allocateVendorPaymentAmounts({ orgA: 6000, orgB: 4000 }, 10000, 10800);

    expect(allocations).toHaveLength(2);
    expect(allocations.reduce((sum, entry) => sum + entry.amountCents, 0)).toBe(10800);
    expect(allocations.find((entry) => entry.orgId === "orgA")?.amountCents).toBe(6480);
    expect(allocations.find((entry) => entry.orgId === "orgB")?.amountCents).toBe(4320);
  });
});
