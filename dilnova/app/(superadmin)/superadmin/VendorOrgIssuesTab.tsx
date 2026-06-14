'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  countSelectedScopeRecords,
  formatReassignCounts,
  getDefaultReassignScopesForGroup,
  type VendorOrgIntegrityReport,
  type VendorOrgIssueGroup,
  type VendorOrgReassignScopes,
} from '@/utils/vendorOrgIntegrity';
import { reassignProductOrgAction, reassignVendorOrgAction } from './vendorOrgActions';

interface OrganizationOption {
  id: string;
  name: string;
  slug: string | null;
}

interface VendorOrgIssuesTabProps {
  integrityReport: VendorOrgIntegrityReport;
  organizations: OrganizationOption[];
  triggerNotification: (success: boolean, message: string) => void;
}

type ReassignScopes = VendorOrgReassignScopes;

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
}

function IssueGroupCard({
  group,
  organizations,
  onNotify,
  onRefresh,
}: {
  group: VendorOrgIssueGroup;
  organizations: OrganizationOption[];
  onNotify: (success: boolean, message: string) => void;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isBulkReassigning, setIsBulkReassigning] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [scopes, setScopes] = useState<ReassignScopes>(() => getDefaultReassignScopesForGroup(group));
  const [expanded, setExpanded] = useState(false);
  const [productTargets, setProductTargets] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((a, b) => a.name.localeCompare(b.name)),
    [organizations]
  );

  const selectedRecordCount = useMemo(
    () => countSelectedScopeRecords(group, scopes),
    [group, scopes]
  );

  const targetOrgName =
    sortedOrganizations.find((org) => org.id === targetOrgId)?.name || 'the selected organization';

  const handleBulkReassign = () => {
    if (!targetOrgId) {
      onNotify(false, 'Select a target organization.');
      return;
    }

    if (!Object.values(scopes).some(Boolean)) {
      onNotify(false, 'Select at least one record type to reassign.');
      return;
    }

    if (selectedRecordCount === 0) {
      onNotify(false, 'No records match the selected record types for this orphan org.');
      return;
    }

    setShowConfirm(true);
  };

  const executeBulkReassign = () => {
    setShowConfirm(false);
    setIsBulkReassigning(true);

    startTransition(async () => {
      try {
        const result = await reassignVendorOrgAction({
          fromOrgId: group.orgId,
          toOrgId: targetOrgId,
          scopes,
        });
        const { counts } = result;
        onNotify(
          true,
          `Reassigned ${formatReassignCounts(counts)} from ${group.orgId.slice(0, 8)}… to ${targetOrgName}.`
        );
        setTargetOrgId('');
        setScopes(getDefaultReassignScopesForGroup(group));
        onRefresh();
      } catch (error) {
        onNotify(false, getActionErrorMessage(error, 'Reassignment failed.'));
      } finally {
        setIsBulkReassigning(false);
      }
    });
  };

  const handleSingleProductReassign = (productId: string, productName: string) => {
    const toOrgId = productTargets[productId];
    if (!toOrgId) {
      onNotify(false, `Select a target organization for ${productName}.`);
      return;
    }

    startTransition(async () => {
      try {
        await reassignProductOrgAction(productId, toOrgId);
        onNotify(true, `Updated vendor org for "${productName}".`);
        onRefresh();
      } catch (error) {
        onNotify(false, getActionErrorMessage(error, 'Product reassignment failed.'));
      }
    });
  };

  const scopeOptions: Array<{ key: keyof ReassignScopes; label: string; count: number }> = [
    { key: 'products', label: 'Products', count: group.products.length },
    { key: 'orderItems', label: 'Order items', count: group.orderItems.length },
    { key: 'suppliers', label: 'Suppliers', count: group.suppliers.length },
    { key: 'branches', label: 'Branches', count: group.branches.length },
    { key: 'billingReceipts', label: 'Billing receipts', count: group.billingReceipts.length },
  ];

  const isBusy = isPending || isBulkReassigning;

  return (
    <section className="bg-white dark:bg-zinc-950 border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300">
              Missing in Clerk
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {group.totalAffected} affected records
            </span>
          </div>
          <p className="mt-2 text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all">
            {group.orgId}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
            {group.products.length > 0 && <span>{group.products.length} products</span>}
            {group.orderItems.length > 0 && <span>{group.orderItems.length} order lines</span>}
            {group.suppliers.length > 0 && <span>{group.suppliers.length} suppliers</span>}
            {group.branches.length > 0 && <span>{group.branches.length} branches</span>}
            {group.billingReceipts.length > 0 && <span>{group.billingReceipts.length} receipts</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="self-start text-[11px] font-mono uppercase tracking-wider text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-3 border-t border-zinc-100 dark:border-zinc-900 pt-4">
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Reassign all records to
            </span>
            <select
              value={targetOrgId}
              onChange={(e) => setTargetOrgId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
            >
              <option value="">Select live Clerk organization</option>
              {sortedOrganizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.id.slice(0, 8)}…)
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
            {scopeOptions.map(({ key, label, count }) => (
              <label
                key={key}
                className={`inline-flex items-center gap-2 ${count === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  disabled={count === 0 || isBusy}
                  checked={count > 0 && scopes[key]}
                  onChange={(e) =>
                    setScopes((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                />
                <span>
                  {label} ({count})
                </span>
              </label>
            ))}
          </div>
          <p className="text-[10px] font-mono text-zinc-500">
            Selected for reassignment: {selectedRecordCount} record{selectedRecordCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            disabled={isBusy || selectedRecordCount === 0}
            onClick={handleBulkReassign}
            className="w-full xl:w-auto px-5 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {isBusy ? 'Reassigning…' : 'Reassign selected records'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Confirm bulk reassignment
          </p>
          <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
            Move {selectedRecordCount} record{selectedRecordCount === 1 ? '' : 's'} from orphan org{' '}
            <span className="font-mono break-all">{group.orgId}</span> to{' '}
            <span className="font-semibold">{targetOrgName}</span>?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={executeBulkReassign}
              className="px-4 py-2 text-[11px] font-bold rounded-lg bg-purple-700 text-white cursor-pointer disabled:opacity-60"
            >
              Yes, reassign now
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-[11px] font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
          {group.products.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Products showing Unknown Vendor
              </h4>
              <div className="space-y-2">
                {group.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500">
                        {product.type} · {product.status} · {product.id.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={productTargets[product.id] || ''}
                        onChange={(e) =>
                          setProductTargets((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                        className="min-w-[180px] h-9 px-2 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                      >
                        <option value="">Target org</option>
                        {sortedOrganizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSingleProductReassign(product.id, product.name)}
                        className="px-3 py-2 text-[11px] font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer disabled:opacity-60"
                      >
                        Fix
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {group.orderItems.length > 0 && (
            <details className="text-xs text-zinc-600 dark:text-zinc-400">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Order line items ({group.orderItems.length})
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-[11px]">
                {group.orderItems.slice(0, 20).map((item) => (
                  <li key={item.id}>
                    {item.productName} · order {item.orderId.slice(0, 8)}…
                  </li>
                ))}
                {group.orderItems.length > 20 && (
                  <li>…and {group.orderItems.length - 20} more</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

export default function VendorOrgIssuesTab({
  integrityReport,
  organizations,
  triggerNotification,
}: VendorOrgIssuesTabProps) {
  const router = useRouter();

  const refreshReport = () => {
    router.refresh();
  };

  if (integrityReport.issueGroups.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 p-6 text-center">
        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">No vendor org issues found</p>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-2">
          All product, order, supplier, branch, and receipt records point to live Clerk organizations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">
          Vendor Organization Issues
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl">
          These records reference Clerk organization IDs that no longer exist. Storefront items will show
          Unknown Vendor until you reassign them to a live organization.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-950">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Missing org IDs</p>
          <p className="text-lg font-black mt-1">{integrityReport.totals.orphanOrgIds}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-950">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Products</p>
          <p className="text-lg font-black mt-1">{integrityReport.totals.products}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-950">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Order lines</p>
          <p className="text-lg font-black mt-1">{integrityReport.totals.orderItems}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-950">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Suppliers / branches</p>
          <p className="text-lg font-black mt-1">
            {integrityReport.totals.suppliers + integrityReport.totals.branches}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-950">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Live Clerk orgs</p>
          <p className="text-lg font-black mt-1">{integrityReport.knownOrgCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        {integrityReport.issueGroups.map((group) => (
          <IssueGroupCard
            key={group.orgId}
            group={group}
            organizations={organizations}
            onNotify={triggerNotification}
            onRefresh={refreshReport}
          />
        ))}
      </div>
    </div>
  );
}
