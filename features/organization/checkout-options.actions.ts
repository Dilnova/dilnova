'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { updateOrgCheckoutOptionsSchema } from '@/features/organization/schema';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { 
  DEPRECATED_CHECKOUT_OPTION_IDS,
  isPaymentCompatibleWithFulfillment 
} from '@/features/organization/checkout-options.shared';
import {
  BANK_TRANSFER_PAYMENT_ID,
  hasCompleteBankDetails,
} from '@/features/billing/bank-transfer';
import { parseBankDetailsFromClerkOrg } from '@/features/billing/bank-transfer-metadata';
import { rateLimit } from '@/shared/security/rate-limit';
import { requireVendorRole } from '@/shared/auth/vendor-guard';

export async function updateOrgCheckoutOptionsAction(
  organizationId: string,
  checkoutOptions: Record<string, boolean>
) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const parsed = updateOrgCheckoutOptionsSchema.safeParse({ organizationId, checkoutOptions });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid checkout options.');
    }

    const { orgId, orgRole, userId } = await auth();

    if (!userId || !orgId || orgId !== parsed.data.organizationId) {
      throw new Error('Not authorized: You do not belong to this organization.');
    }
    await requireVendorRole(userId);

    if (orgRole !== 'org:admin') {
      throw new Error('Not authorized: Only organization admins can manage checkout options.');
    }

    const catalog = await getCheckoutOptionsCatalog();
    const allowedIds = new Set(catalog.filter((o) => o.platformEnabled).map((o) => o.id));
    const sanitized: Record<string, boolean> = {};

    for (const [key, enabled] of Object.entries(parsed.data.checkoutOptions)) {
      if (!allowedIds.has(key) || DEPRECATED_CHECKOUT_OPTION_IDS.has(key)) continue;
      sanitized[key] = enabled === true;
    }

    let hasValidCombination = false;
    for (const fulfillmentOption of catalog) {
      if (fulfillmentOption.type === 'fulfillment' && fulfillmentOption.platformEnabled && sanitized[fulfillmentOption.id] === true) {
        for (const paymentOption of catalog) {
          if (paymentOption.type === 'payment' && paymentOption.platformEnabled && sanitized[paymentOption.id] === true) {
            if (isPaymentCompatibleWithFulfillment(paymentOption, fulfillmentOption)) {
              hasValidCombination = true;
              break;
            }
          }
        }
      }
      if (hasValidCombination) break;
    }

    if (!hasValidCombination) {
      throw new Error('No valid checkout combinations exist. Please ensure at least one payment method is compatible with your selected fulfillment methods.');
    }

    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: parsed.data.organizationId });
    const existingMeta = (org.publicMetadata || {}) as Record<string, unknown>;

    if (sanitized[BANK_TRANSFER_PAYMENT_ID] === true) {
      const bankDetails = parseBankDetailsFromClerkOrg(org);
      if (!hasCompleteBankDetails(bankDetails)) {
        throw new Error(
          'Complete bank name, account name, and account number in Public Page Setup before enabling bank transfer.'
        );
      }
    }

    await client.organizations.updateOrganization(parsed.data.organizationId, {
      publicMetadata: {
        ...existingMeta,
        checkout_options: sanitized,
      },
    });

    if (userId) {
      await logAuditAction({
        userId,
        action: 'UPDATE_VENDOR_METADATA',
        targetType: 'vendor',
        targetId: parsed.data.organizationId,
        metadata: { checkout_options: sanitized },
      });
    }

    revalidateTag('org-checkout-options', 'max');
    revalidatePath('/admin');
    revalidateVendorConsole();
    revalidatePath('/cart');

    return { success: true };
  });
}
