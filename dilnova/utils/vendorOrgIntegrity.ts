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

export function isKnownVendorOrgId(orgId: string, knownOrgIds: ReadonlySet<string>): boolean {
  return Boolean(orgId) && knownOrgIds.has(orgId);
}

export function buildVendorOrgIntegrityReport(
  knownOrgIds: ReadonlySet<string>,
  data: {
    products: VendorOrgIntegrityProductRef[];
    orderItems: VendorOrgIntegrityOrderItemRef[];
    suppliers: VendorOrgIntegritySupplierRef[];
    branches: VendorOrgIntegrityBranchRef[];
    billingReceipts: VendorOrgIntegrityBillingReceiptRef[];
  }
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
