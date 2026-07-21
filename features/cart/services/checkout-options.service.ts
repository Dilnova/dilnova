import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { inArray } from 'drizzle-orm';
import { resolveCheckoutOptionsForOrgs } from '@/features/organization/checkout-options';
import { BANK_TRANSFER_PAYMENT_ID, toVendorBankTransferAvailability } from '@/features/billing/bank-transfer';
import { getBankTransferDetailsForOrgs } from '@/features/billing/bank-transfer.server';
import { getCachedOrganizations } from '@/shared/auth/clerk-cache';
import { buildVendorCartSummaries, filterCartLinesByVendorOrg, resolveCheckoutVendorOrgId } from '@/features/cart/vendor-checkout';

export async function fetchBranchesForOrgs(orgIds: string[]) {
  const branchRows =
    orgIds.length > 0
      ? await db
          .select({
            id: schema.branches.id,
            orgId: schema.branches.orgId,
            name: schema.branches.name,
            address: schema.branches.address,
            phone: schema.branches.phone,
          })
          .from(schema.branches)
          .where(inArray(schema.branches.orgId, orgIds))
      : [];

  const branchesByOrg = new Map<
    string,
    { id: string; name: string; address: string | null; phone: string | null }[]
  >();
  for (const branch of branchRows) {
    const list = branchesByOrg.get(branch.orgId) || [];
    list.push({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    });
    branchesByOrg.set(branch.orgId, list);
  }

  return { branchRows, branchesByOrg };
}

export async function getCheckoutOptionsService(
  cartLines: { id: string; quantity: number; price: number }[],
  checkoutVendorOrgId?: string | null
) {
  if (cartLines.length === 0) {
    return {
      success: true as const,
      fulfillment: [],
      payment: [],
      pickupBranches: [],
      singleVendorOrgId: null,
      vendorCount: 0,
      vendorBankTransferByOrg: {},
      vendorCartSummary: [],
    };
  }

  const uniqueIds = [...new Set(cartLines.map((line) => line.id))];
  const products = await db
    .select({
      id: schema.products.id,
      orgId: schema.products.orgId,
      price: schema.products.price,
    })
    .from(schema.products)
    .where(inArray(schema.products.id, uniqueIds));

  const productById = new Map(products.map((product) => [product.id, product]));
  const uniqueOrgIds = [...new Set(products.map((product) => product.orgId))];

  const cachedOrgs = await getCachedOrganizations();
  const vendorNamesByOrg = Object.fromEntries(
    cachedOrgs.map((org) => [org.id, org.name])
  );

  const resolvedCheckoutVendorOrgId = resolveCheckoutVendorOrgId(
    buildVendorCartSummaries(cartLines, productById, vendorNamesByOrg),
    checkoutVendorOrgId
  );

  if (uniqueOrgIds.length > 1 && !resolvedCheckoutVendorOrgId) {
    const bankDetailsByOrg = await getBankTransferDetailsForOrgs(uniqueOrgIds);
    const vendorCartSummary = buildVendorCartSummaries(
      cartLines,
      productById,
      vendorNamesByOrg
    );

    return {
      success: true as const,
      fulfillment: [],
      payment: [],
      pickupBranches: [],
      singleVendorOrgId: null,
      vendorCount: uniqueOrgIds.length,
      checkoutVendorOrgId: null,
      requiresVendorSelection: true as const,
      vendorBankTransferByOrg: Object.fromEntries(
        uniqueOrgIds.map((orgId) => [
          orgId,
          toVendorBankTransferAvailability(
            bankDetailsByOrg[orgId] ?? { vendorName: 'Vendor', bankDetails: null }
          ),
        ])
      ),
      vendorCartSummary,
    };
  }

  const orgIdsForOptions =
    resolvedCheckoutVendorOrgId != null
      ? [resolvedCheckoutVendorOrgId]
      : uniqueOrgIds;

  const { branchesByOrg } = await fetchBranchesForOrgs(orgIdsForOptions);

  const resolved = await resolveCheckoutOptionsForOrgs(orgIdsForOptions, branchesByOrg);
  const bankTransferEnabled = resolved.payment.some((o) => o.id === BANK_TRANSFER_PAYMENT_ID);
  const bankDetailsByOrg = bankTransferEnabled
    ? await getBankTransferDetailsForOrgs(uniqueOrgIds)
    : {};
  const vendorCartSummary = buildVendorCartSummaries(
    cartLines,
    productById,
    vendorNamesByOrg
  );

  return {
    success: true as const,
    fulfillment: resolved.fulfillment.map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
      zeroShipping: o.zeroShipping === true,
      requiresBranch: o.requiresBranch === true,
    })),
    payment: resolved.payment.map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
      requiresDelivery: o.requiresDelivery === true,
      pendingPayment: o.pendingPayment === true,
    })),
    pickupBranches: resolved.pickupBranches,
    singleVendorOrgId: resolved.singleVendorOrgId,
    vendorCount: uniqueOrgIds.length,
    checkoutVendorOrgId: resolvedCheckoutVendorOrgId,
    requiresVendorSelection: false as const,
    vendorBankTransferByOrg: Object.fromEntries(
      uniqueOrgIds.map((orgId) => [
        orgId,
        toVendorBankTransferAvailability(
          bankDetailsByOrg[orgId] ?? { vendorName: 'Vendor', bankDetails: null }
        ),
      ])
    ),
    vendorCartSummary,
  };
}
