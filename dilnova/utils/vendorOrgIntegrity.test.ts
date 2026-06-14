import { describe, expect, it } from 'vitest';
import {
  buildVendorOrgIntegrityReport,
  countSelectedScopeRecords,
  formatReassignCounts,
  getDefaultReassignScopesForGroup,
} from './vendorOrgIntegrity';

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

  it('derives default scopes and selected counts from issue groups', () => {
    const group = {
      orgId: 'org_dead',
      products: [{ id: 'p1', name: 'Widget', type: 'product', orgId: 'org_dead', status: 'active' }],
      orderItems: [],
      suppliers: [{ id: 's1', name: 'Supplier', orgId: 'org_dead' }],
      branches: [],
      billingReceipts: [],
      totalAffected: 2,
    };

    expect(getDefaultReassignScopesForGroup(group)).toEqual({
      products: true,
      orderItems: false,
      suppliers: true,
      branches: false,
      billingReceipts: false,
    });
    expect(countSelectedScopeRecords(group, getDefaultReassignScopesForGroup(group))).toBe(2);
    expect(
      formatReassignCounts({
        products: 1,
        orderItems: 0,
        suppliers: 1,
        branches: 0,
        billingReceipts: 0,
      })
    ).toBe('1 product, 1 supplier');
  });
});
