import { describe, expect, it } from 'vitest';
import { buildVendorOrgIntegrityReport } from './vendorOrgIntegrity';

describe('vendorOrgIntegrity', () => {
  it('groups orphaned org references across entities', () => {
    const report = buildVendorOrgIntegrityReport(new Set(['org_live']), {
      products: [
        { id: 'p1', name: 'Widget', type: 'product', orgId: 'org_dead', status: 'active' },
        { id: 'p2', name: 'Service', type: 'service', orgId: 'org_live', status: 'active' },
      ],
      orderItems: [
        {
          id: 'oi1',
          orderId: 'o1',
          productName: 'Widget',
          vendorOrgId: 'org_dead',
        },
      ],
      suppliers: [],
      branches: [],
      billingReceipts: [],
    });

    expect(report.totals.orphanOrgIds).toBe(1);
    expect(report.totals.products).toBe(1);
    expect(report.totals.orderItems).toBe(1);
    expect(report.issueGroups[0]?.orgId).toBe('org_dead');
    expect(report.issueGroups[0]?.totalAffected).toBe(2);
  });
});
