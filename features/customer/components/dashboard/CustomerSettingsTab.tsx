import CustomerDeliverySettingsForm from '@/features/customer/components/CustomerDeliverySettingsForm';

interface CustomerSettingsTabProps {
  user: {
    id: string;
    firstName: string | null | undefined;
    lastName: string | null | undefined;
  };
  orgRole: string | null | undefined;
  userRole: string | null | undefined;
  isSuperAdmin: boolean;
  deliveryDetails: any;
}

export default function CustomerSettingsTab({
  user,
  orgRole,
  userRole,
  isSuperAdmin,
  deliveryDetails,
}: CustomerSettingsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Profile & Account Settings</h3>
        <p className="text-xs text-zinc-500 font-medium">Manage preferences and view account configuration details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm dark:bg-zinc-900/40 dark:border-zinc-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">User Details</h4>
          <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            <li><span className="text-zinc-400 dark:text-zinc-500">User ID:</span> {user.id}</li>
            <li><span className="text-zinc-400 dark:text-zinc-500">First Name:</span> {user.firstName || '—'}</li>
            <li><span className="text-zinc-400 dark:text-zinc-500">Last Name:</span> {user.lastName || '—'}</li>
            <li><span className="text-zinc-400 dark:text-zinc-500">Org Context Role:</span> {orgRole || 'None'}</li>
          </ul>
        </div>
        <div className="md:col-span-2 mt-2">
          <CustomerDeliverySettingsForm initialData={deliveryDetails} />
        </div>
      </div>

      {/* Dynamic Permissions & Access Panel */}
      <div className="border border-purple-200 bg-purple-50/30 rounded-2xl p-6 dark:border-purple-900/30 dark:bg-purple-950/10 mt-6">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4 font-sans">
          <span className="text-purple-600 dark:text-purple-400">🛡️</span> Your Access & Permissions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isSuperAdmin ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm sm:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-500 font-bold">✓</span>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Super Administrator</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">You have unrestricted global access across the entire platform. All administrative actions are fully permitted.</p>
            </div>
          ) : orgRole === 'org:admin' ? (
            <>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Full Catalog & Inventory</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Create, edit, and delete products, manage suppliers, and adjust branch inventory.</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Admin Console</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Configure bank transfer details, checkout options, and manage staff roles.</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">POS Register</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Full checkout permission across all active branch registers.</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Vendor Status</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Your account holds a registered vendor status.</p>
              </div>
            </>
          ) : orgRole === 'org:member' ? (
            <>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">POS Register</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Process checkouts and manage offline billing transactions at your assigned branch.</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Catalog Management</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Add new products and services to the organization&apos;s storefront catalog.</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Storefront Profile</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Update the public description, contact details, and banner image of the store.</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 p-4 rounded-xl opacity-80">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-400 font-bold">✕</span>
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Admin Privileges</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Deleting catalog items, managing staff roles, and configuring bank details are restricted to admins.</p>
              </div>
            </>
          ) : userRole === 'vendor' ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm sm:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-500 font-bold">✓</span>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Vendor Account</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">You are a registered vendor. Switch to your organization to access your dashboard.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm sm:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-500 font-bold">✓</span>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Standard Customer</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">You can browse catalogs, save items to your wishlist, and place orders. You do not have vendor permissions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
