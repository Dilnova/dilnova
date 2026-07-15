'use client';

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: Record<string, any>;
}

interface IMSLicenseModalProps {
  managingOrg: Organization;
  onClose: () => void;
  licenseImsEnabled: boolean;
  setLicenseImsEnabled: (val: boolean) => void;
  licenseImsExpiresAt: string;
  setLicenseImsExpiresAt: (val: string) => void;
  licenseImsMultiBranchEnabled: boolean;
  setLicenseImsMultiBranchEnabled: (val: boolean) => void;
  licenseImsBillingEnabled: boolean;
  setLicenseImsBillingEnabled: (val: boolean) => void;
  licenseMaxListingCount: number;
  setLicenseMaxListingCount: (val: number) => void;
  handleSaveLicense: (e: React.FormEvent) => void;
  isPending: boolean;
}

export default function IMSLicenseModal({
  managingOrg,
  onClose,
  licenseImsEnabled,
  setLicenseImsEnabled,
  licenseImsExpiresAt,
  setLicenseImsExpiresAt,
  licenseImsMultiBranchEnabled,
  setLicenseImsMultiBranchEnabled,
  licenseImsBillingEnabled,
  setLicenseImsBillingEnabled,
  licenseMaxListingCount,
  setLicenseMaxListingCount,
  handleSaveLicense,
  isPending,
}: IMSLicenseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
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

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Max Active Listings
            </label>
            <p className="text-[10px] text-zinc-400 font-mono">Default: 10 for all orgs (free tier). Increase for premium plans.</p>
            <input
              type="number"
              min={1}
              max={100000}
              step={1}
              value={licenseMaxListingCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) setLicenseMaxListingCount(val);
              }}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50">Save License Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}
