import type { VendorMetadataInput } from "@/features/vendor/schema";
import {
  type BankTransferDetails,
  hasCompleteBankDetails,
  parseBankTransferDetailsFromMetadata,
} from "@/features/billing/bank-transfer";

/** Clerk metadata keys for bank transfer details (stored in privateMetadata only). */
export const BANK_METADATA_KEYS = [
  "bankName",
  "bankAccountName",
  "bankAccountNumber",
  "bankBranchCode",
  "bankTransferInstructions",
] as const;

export type BankMetadataKey = (typeof BANK_METADATA_KEYS)[number];

export interface ClerkOrgMetadataSource {
  publicMetadata?: unknown;
  privateMetadata?: unknown;
}

export function stripBankFieldsFromPublic(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...metadata };
  for (const key of BANK_METADATA_KEYS) {
    delete next[key];
  }
  return next;
}

export function buildBankPrivateMetadataFromVendorData(
  data: Pick<
    VendorMetadataInput,
    | "bankName"
    | "bankAccountName"
    | "bankAccountNumber"
    | "bankBranchCode"
    | "bankTransferInstructions"
  >,
): Record<BankMetadataKey, string> {
  return {
    bankName: data.bankName ?? "",
    bankAccountName: data.bankAccountName ?? "",
    bankAccountNumber: data.bankAccountNumber ?? "",
    bankBranchCode: data.bankBranchCode ?? "",
    bankTransferInstructions: data.bankTransferInstructions ?? "",
  };
}

export function buildPublicProfileMetadataFromVendorData(
  data: Pick<
    VendorMetadataInput,
    "description" | "address" | "phone" | "bannerUrl" | "stockAllocationMode"
  >,
): Record<string, string> {
  return {
    description: data.description,
    address: data.address,
    phone: data.phone,
    bannerUrl: data.bannerUrl,
    stockAllocationMode: data.stockAllocationMode ?? "central_intake",
  };
}

/**
 * Reads bank transfer details from Clerk org privateMetadata only.
 */
export function parseBankDetailsFromClerkOrg(
  org: ClerkOrgMetadataSource,
): BankTransferDetails | null {
  const privateMeta = (org.privateMetadata || {}) as Record<string, unknown>;
  return parseBankTransferDetailsFromMetadata(privateMeta);
}

export function hasBankTransferConfiguredForOrg(org: ClerkOrgMetadataSource): boolean {
  return hasCompleteBankDetails(parseBankDetailsFromClerkOrg(org));
}

/** Maps parsed bank details to VendorProfileForm field names. */
export function bankDetailsToProfileFormFields(details: BankTransferDetails | null): {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankTransferInstructions: string;
} {
  return {
    bankName: details?.bankName ?? "",
    bankAccountName: details?.accountName ?? "",
    bankAccountNumber: details?.accountNumber ?? "",
    bankBranchCode: details?.branchCode ?? "",
    bankTransferInstructions: details?.instructions ?? "",
  };
}

/** Returns true when legacy bank fields still exist on publicMetadata. */
export function hasLegacyPublicBankMetadata(
  publicMetadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!publicMetadata) {
    return false;
  }
  return BANK_METADATA_KEYS.some((key) => {
    const value = publicMetadata[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}
