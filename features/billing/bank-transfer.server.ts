import "server-only";

import { createClerkClient } from "@clerk/nextjs/server";
import {
  type BankTransferDetails,
  type BankTransferCheckoutInstructions,
  type BankTransferVendorInstruction,
  formatBankTransferReference,
} from "./bank-transfer";
import { parseBankDetailsFromClerkOrg } from "./bank-transfer-metadata";
import { logger } from "@/shared/logging/logger";

export async function getBankTransferDetailsForOrg(
  orgId: string,
): Promise<{ vendorName: string; bankDetails: BankTransferDetails | null }> {
  try {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    return {
      vendorName: org.name,
      bankDetails: parseBankDetailsFromClerkOrg(org),
    };
  } catch (error) {
    logger.error("Failed to load bank transfer details for org", error, { orgId });
    return { vendorName: "Vendor", bankDetails: null };
  }
}

export async function getBankTransferDetailsForOrgs(
  orgIds: string[],
): Promise<Record<string, { vendorName: string; bankDetails: BankTransferDetails | null }>> {
  const uniqueOrgIds = [...new Set(orgIds.filter(Boolean))];
  const entries = await Promise.all(
    uniqueOrgIds.map(async (orgId) => {
      const details = await getBankTransferDetailsForOrg(orgId);
      return [orgId, details] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function buildBankTransferCheckoutInstructions(input: {
  orderId: string;
  grandTotalCents: number;
  vendorAmounts: { orgId: string; amountCents: number }[];
}): Promise<BankTransferCheckoutInstructions> {
  const detailsByOrg = await getBankTransferDetailsForOrgs(
    input.vendorAmounts.map((entry) => entry.orgId),
  );

  const vendors: BankTransferVendorInstruction[] = input.vendorAmounts.map((entry) => ({
    orgId: entry.orgId,
    vendorName: detailsByOrg[entry.orgId]?.vendorName || "Vendor",
    amountCents: entry.amountCents,
    bankDetails: detailsByOrg[entry.orgId]?.bankDetails ?? null,
  }));

  return {
    orderId: input.orderId,
    reference: formatBankTransferReference(input.orderId),
    grandTotalCents: input.grandTotalCents,
    vendors,
  };
}
