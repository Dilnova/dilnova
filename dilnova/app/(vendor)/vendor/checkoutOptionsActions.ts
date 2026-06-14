'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/utils/revalidateVendorConsole';
import { updateOrgCheckoutOptionsSchema } from '@/features/organization/schema';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { getCheckoutOptionsCatalog } from '@/utils/checkoutOptions';
import { DEPRECATED_CHECKOUT_OPTION_IDS } from '@/utils/checkoutOptionsShared';
import {
  BANK_TRANSFER_PAYMENT_ID,
  hasCompleteBankDetails,
  parseBankTransferDetailsFromMetadata,
} from '@/utils/bankTransfer';

export async function updateOrgCheckoutOptionsAction(
  organizationId: string,
  checkoutOptions: Record<string, boolean>
) {
  return runWithCorrelationId(async () => {
    const parsed = updateOrgCheckoutOptionsSchema.safeParse({ organizationId, checkoutOptions });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid checkout options.');
    }

    const { orgId, orgRole, userId } = await auth();

    if (!orgId || orgId !== parsed.data.organizationId) {
      throw new Error('Not authorized: You do not belong to this organization.');
    }

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

    const enabledFulfillment = catalog.some(
      (option) => option.type === 'fulfillment' && option.platformEnabled && sanitized[option.id] === true
    );
    const enabledPayment = catalog.some(
      (option) => option.type === 'payment' && option.platformEnabled && sanitized[option.id] === true
    );
    if (!enabledFulfillment || !enabledPayment) {
      throw new Error('Enable at least one fulfillment method and one payment method.');
    }

    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: parsed.data.organizationId });
    const existingMeta = (org.publicMetadata || {}) as Record<string, unknown>;

    if (sanitized[BANK_TRANSFER_PAYMENT_ID] === true) {
      const bankDetails = parseBankTransferDetailsFromMetadata(existingMeta);
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
