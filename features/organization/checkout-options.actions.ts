"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import { updateOrgCheckoutOptionsSchema } from "@/features/organization/schema";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { getCheckoutOptionsCatalog } from "@/features/organization/checkout-options";
import {
  DEPRECATED_CHECKOUT_OPTION_IDS,
  isPaymentCompatibleWithFulfillment,
} from "@/features/organization/checkout-options.shared";
import { BANK_TRANSFER_PAYMENT_ID, hasCompleteBankDetails } from "@/features/billing/bank-transfer";
import { parseBankDetailsFromClerkOrg } from "@/features/billing/bank-transfer-metadata";
import { rateLimit } from "@/shared/security/rate-limit";
import { orgAdminAction, ActionError } from "@/lib/safe-action";

export const updateOrgCheckoutOptionsAction = orgAdminAction
  .schema(updateOrgCheckoutOptionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000);

      // Cross-tenant guard: the active org in the session must match the target org
      if (!ctx.orgId || ctx.orgId !== parsedInput.organizationId) {
        throw new ActionError("Not authorized: You do not belong to this organization.");
      }

      const catalog = await getCheckoutOptionsCatalog();
      const allowedIds = new Set(catalog.filter((o) => o.platformEnabled).map((o) => o.id));
      const sanitized: Record<string, boolean> = {};

      for (const [key, enabled] of Object.entries(parsedInput.checkoutOptions)) {
        if (!allowedIds.has(key) || DEPRECATED_CHECKOUT_OPTION_IDS.has(key)) continue;
        sanitized[key] = enabled === true;
      }

      const selectedFulfillments = catalog.filter(
        (o) => o.type === "fulfillment" && o.platformEnabled && sanitized[o.id] === true,
      );
      const selectedPayments = catalog.filter(
        (o) => o.type === "payment" && o.platformEnabled && sanitized[o.id] === true,
      );

      if (selectedFulfillments.length === 0 || selectedPayments.length === 0) {
        throw new ActionError(
          "You must select at least one fulfillment method and one payment method.",
        );
      }

      for (const f of selectedFulfillments) {
        const hasCompatiblePayment = selectedPayments.some((p) =>
          isPaymentCompatibleWithFulfillment(p, f),
        );
        if (!hasCompatiblePayment) {
          throw new ActionError(
            `Fulfillment method "${f.label}" has no compatible payment methods selected.`,
          );
        }
      }

      for (const p of selectedPayments) {
        const hasCompatibleFulfillment = selectedFulfillments.some((f) =>
          isPaymentCompatibleWithFulfillment(p, f),
        );
        if (!hasCompatibleFulfillment) {
          throw new ActionError(
            `Payment method "${p.label}" has no compatible fulfillment methods selected.`,
          );
        }
      }

      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: parsedInput.organizationId,
      });
      const existingMeta = (org.publicMetadata || {}) as Record<string, unknown>;

      if (sanitized[BANK_TRANSFER_PAYMENT_ID] === true) {
        const bankDetails = parseBankDetailsFromClerkOrg(org);
        if (!hasCompleteBankDetails(bankDetails)) {
          throw new ActionError(
            "Complete bank name, account name, and account number in Public Page Setup before enabling bank transfer.",
          );
        }
      }

      await client.organizations.updateOrganization(parsedInput.organizationId, {
        publicMetadata: {
          ...existingMeta,
          checkout_options: sanitized,
        },
      });

      await logAuditAction({
        userId: ctx.userId,
        action: "UPDATE_VENDOR_METADATA",
        targetType: "vendor",
        targetId: parsedInput.organizationId,
        metadata: { checkout_options: sanitized },
      });

      revalidateTag("org-checkout-options", "max");
      revalidatePath("/admin");
      revalidateVendorConsole();
      revalidatePath("/cart");

      return { success: true };
    });
  });
