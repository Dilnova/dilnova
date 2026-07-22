export interface VendorOrgIntegrityProductRef {
  id: string;
  name: string;
  type: string;
  orgId: string;
  status: string;
}

export interface VendorOrgIntegrityOrderItemRef {
  id: string;
  orderId: string;
  productName: string;
  vendorOrgId: string;
}

export interface VendorOrgIntegritySupplierRef {
  id: string;
  name: string;
  orgId: string;
}

export interface VendorOrgIntegrityBranchRef {
  id: string;
  name: string;
  orgId: string;
}

export interface VendorOrgIntegrityBillingReceiptRef {
  id: string;
  orgId: string;
}

export interface VendorOrgIssueGroup {
  orgId: string;
  products: VendorOrgIntegrityProductRef[];
  orderItems: VendorOrgIntegrityOrderItemRef[];
  suppliers: VendorOrgIntegritySupplierRef[];
  branches: VendorOrgIntegrityBranchRef[];
  billingReceipts: VendorOrgIntegrityBillingReceiptRef[];
  totalAffected: number;
}

export interface VendorOrgIntegrityReport {
  knownOrgCount: number;
  issueGroups: VendorOrgIssueGroup[];
  totals: {
    orphanOrgIds: number;
    products: number;
    orderItems: number;
    suppliers: number;
    branches: number;
    billingReceipts: number;
  };
}

export type VendorOrgReassignScopes = {
  products: boolean;
  orderItems: boolean;
  suppliers: boolean;
  branches: boolean;
  billingReceipts: boolean;
};

export function isKnownVendorOrgId(orgId: string, knownOrgIds: ReadonlySet<string>): boolean {
  return Boolean(orgId) && knownOrgIds.has(orgId);
}

export function getDefaultReassignScopesForGroup(
  group: VendorOrgIssueGroup,
): VendorOrgReassignScopes {
  return {
    products: group.products.length > 0,
    orderItems: group.orderItems.length > 0,
    suppliers: group.suppliers.length > 0,
    branches: group.branches.length > 0,
    billingReceipts: group.billingReceipts.length > 0,
  };
}

export function countSelectedScopeRecords(
  group: VendorOrgIssueGroup,
  scopes: VendorOrgReassignScopes,
): number {
  let total = 0;
  if (scopes.products) total += group.products.length;
  if (scopes.orderItems) total += group.orderItems.length;
  if (scopes.suppliers) total += group.suppliers.length;
  if (scopes.branches) total += group.branches.length;
  if (scopes.billingReceipts) total += group.billingReceipts.length;
  return total;
}

export function formatReassignCounts(counts: {
  products: number;
  orderItems: number;
  suppliers: number;
  branches: number;
  billingReceipts: number;
}): string {
  const parts: string[] = [];
  if (counts.products > 0)
    parts.push(`${counts.products} product${counts.products === 1 ? "" : "s"}`);
  if (counts.orderItems > 0)
    parts.push(`${counts.orderItems} order line${counts.orderItems === 1 ? "" : "s"}`);
  if (counts.suppliers > 0)
    parts.push(`${counts.suppliers} supplier${counts.suppliers === 1 ? "" : "s"}`);
  if (counts.branches > 0)
    parts.push(`${counts.branches} branch${counts.branches === 1 ? "" : "es"}`);
  if (counts.billingReceipts > 0) {
    parts.push(`${counts.billingReceipts} receipt${counts.billingReceipts === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? parts.join(", ") : "0 records";
}

export function buildVendorOrgIntegrityReport(
  knownOrgIds: ReadonlySet<string>,
  data: {
    products: VendorOrgIntegrityProductRef[];
    orderItems: VendorOrgIntegrityOrderItemRef[];
    suppliers: VendorOrgIntegritySupplierRef[];
    branches: VendorOrgIntegrityBranchRef[];
    billingReceipts: VendorOrgIntegrityBillingReceiptRef[];
  },
): VendorOrgIntegrityReport {
  const groupMap = new Map<string, VendorOrgIssueGroup>();

  const ensureGroup = (orgId: string): VendorOrgIssueGroup => {
    const existing = groupMap.get(orgId);
    if (existing) return existing;
    const created: VendorOrgIssueGroup = {
      orgId,
      products: [],
      orderItems: [],
      suppliers: [],
      branches: [],
      billingReceipts: [],
      totalAffected: 0,
    };
    groupMap.set(orgId, created);
    return created;
  };

  const registerIfOrphan = (orgId: string, register: (group: VendorOrgIssueGroup) => void) => {
    if (isKnownVendorOrgId(orgId, knownOrgIds)) return;
    const group = ensureGroup(orgId);
    register(group);
    group.totalAffected += 1;
  };

  for (const product of data.products) {
    registerIfOrphan(product.orgId, (group) => {
      group.products.push(product);
    });
  }

  for (const item of data.orderItems) {
    registerIfOrphan(item.vendorOrgId, (group) => {
      group.orderItems.push(item);
    });
  }

  for (const supplier of data.suppliers) {
    registerIfOrphan(supplier.orgId, (group) => {
      group.suppliers.push(supplier);
    });
  }

  for (const branch of data.branches) {
    registerIfOrphan(branch.orgId, (group) => {
      group.branches.push(branch);
    });
  }

  for (const receipt of data.billingReceipts) {
    registerIfOrphan(receipt.orgId, (group) => {
      group.billingReceipts.push(receipt);
    });
  }

  const issueGroups = [...groupMap.values()].sort((a, b) => b.totalAffected - a.totalAffected);

  return {
    knownOrgCount: knownOrgIds.size,
    issueGroups,
    totals: {
      orphanOrgIds: issueGroups.length,
      products: issueGroups.reduce((sum, group) => sum + group.products.length, 0),
      orderItems: issueGroups.reduce((sum, group) => sum + group.orderItems.length, 0),
      suppliers: issueGroups.reduce((sum, group) => sum + group.suppliers.length, 0),
      branches: issueGroups.reduce((sum, group) => sum + group.branches.length, 0),
      billingReceipts: issueGroups.reduce((sum, group) => sum + group.billingReceipts.length, 0),
    },
  };
}
