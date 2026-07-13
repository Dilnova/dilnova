'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { updateOrgImsLicenseAction } from '@/features/inventory/superadmin.actions';

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: Record<string, any>;
}

interface LicensesTabProps {
  organizations: Organization[];
}

export default function LicensesTab({ organizations }: LicensesTabProps) {
  const [isPending, startTransition] = useTransition();

  // ── IMS License Modal State ──
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [managingOrg, setManagingOrg] = useState<Organization | null>(null);
  const [licenseImsEnabled, setLicenseImsEnabled] = useState(false);
  const [licenseImsExpiresAt, setLicenseImsExpiresAt] = useState('');
  const [licenseImsMultiBranchEnabled, setLicenseImsMultiBranchEnabled] = useState(false);
  const [licenseImsBillingEnabled, setLicenseImsBillingEnabled] = useState(false);
  const [now, setNow] = useState<number>(0);
  
  useEffect(() => {
    requestAnimationFrame(() => {
      setNow(Date.now());
    });
  }, []);

  const handleSaveLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingOrg) return;
    startTransition(async () => {
      try {
        await updateOrgImsLicenseAction({
          organizationId: managingOrg.id,
          imsEnabled: licenseImsEnabled,
          imsExpiresAt: licenseImsExpiresAt || null,
          imsMultiBranchEnabled: licenseImsMultiBranchEnabled,
          imsBillingEnabled: licenseImsBillingEnabled,
        });
        toast.success('Organization IMS license updated successfully.');
        setIsLicenseModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update license.');
      }
    });
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">IMS License Management</h2>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Control premium feature flags and access limits per organization</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-2.5 px-4">Organization</th>
                  <th className="py-2.5 px-4">IMS Status</th>
                  <th className="py-2.5 px-4">Expires At</th>
                  <th className="py-2.5 px-4">Multi-Branch</th>
                  <th className="py-2.5 px-4">POS Billing</th>
                  <th className="py-2.5 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {organizations.map((org) => {
                  const imsEnabled = org.publicMetadata?.ims_enabled === true;
                  const imsExpiresAt = org.publicMetadata?.ims_expires_at || null;
                  const multiBranchEnabled = org.publicMetadata?.ims_multi_branch_enabled === true;
                  const billingEnabled = org.publicMetadata?.ims_billing_enabled === true;

                  let isExpired = false;
                  if (imsExpiresAt) {
                    isExpired = new Date(imsExpiresAt).getTime() < now;
                  }

                  return (
                    <tr key={org.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {org.imageUrl && (
                            <img src={org.imageUrl} alt={org.name} className="w-6 h-6 rounded-full" />
                          )}
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-200">{org.name}</p>
                            <p className="text-[9px] text-zinc-400 font-mono">ID: {org.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {imsEnabled ? (
                          isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">EXPIRED</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">ACTIVE</span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-150 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">INACTIVE</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-550">
                        {imsExpiresAt ? new Date(imsExpiresAt).toLocaleDateString() : 'Lifetime Access'}
                      </td>
                      <td className="py-3 px-4">
                        {multiBranchEnabled ? (
                          <span className="text-emerald-600">✓ Unlocked</span>
                        ) : (
                          <span className="text-zinc-400">— Locked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {billingEnabled ? (
                          <span className="text-emerald-600">✓ Unlocked</span>
                        ) : (
                          <span className="text-zinc-400">— Locked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setManagingOrg(org);
                            setLicenseImsEnabled(imsEnabled);
                            setLicenseImsExpiresAt(imsExpiresAt ? new Date(imsExpiresAt).toISOString().split('T')[0] : '');
                            setLicenseImsMultiBranchEnabled(multiBranchEnabled);
                            setLicenseImsBillingEnabled(billingEnabled);
                            setIsLicenseModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {organizations.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-zinc-400 font-mono text-sm">No organizations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── IMS License Modal ── */}
      {isLicenseModalOpen && managingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsLicenseModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Manage IMS License: {managingOrg.name}</h3>
              <p className="text-[10px] text-zinc-450 mt-1 font-mono">Org ID: {managingOrg.id}</p>
            </div>
            <form onSubmit={handleSaveLicense} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Enable Inventory Management (IMS)</span>
                <input
                  type="checkbox"
                  checked={licenseImsEnabled}
                  onChange={(e) => setLicenseImsEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-650"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">License Expiration Date (leave empty for lifetime access)</label>
                <input
                  type="date"
                  value={licenseImsExpiresAt}
                  onChange={(e) => setLicenseImsExpiresAt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Unlock Multi-Branch stock tracking (Tier 2)</span>
                <input
                  type="checkbox"
                  checked={licenseImsMultiBranchEnabled}
                  onChange={(e) => setLicenseImsMultiBranchEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-650"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Unlock POS Billing Register & checkout (Tier 3)</span>
                <input
                  type="checkbox"
                  checked={licenseImsBillingEnabled}
                  onChange={(e) => setLicenseImsBillingEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-650"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsLicenseModalOpen(false)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">Save License Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
