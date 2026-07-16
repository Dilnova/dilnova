import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import VendorProfileForm from '@/features/vendor/components/VendorProfileForm';
import OrgCheckoutOptionsForm from '@/features/organization/components/OrgCheckoutOptionsForm';
import RoleSelector from '@/features/admin/components/RoleSelector';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { getBranchCountForOrg } from '@/features/admin/queries';
import { bankDetailsToProfileFormFields, hasBankTransferConfiguredForOrg, parseBankDetailsFromClerkOrg } from '@/features/billing/bank-transfer-metadata';
import Image from 'next/image';
import { logger } from '@/shared/logging/logger';

export default async function AdminPage() {
  const { orgId, orgRole } = await auth();
  const user = await currentUser();

  if (!orgId) {
    throw new Error('No active organization detected.');
  }

  // Fetch current organization details and membership directories in parallel (reduce latency)
  const client = await clerkClient();
  const [org, membershipsResponse, checkoutOptionsCatalog, branchCountRow] = await Promise.all([
    client.organizations.getOrganization({ organizationId: orgId }),
    client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    }).catch((err) => { logger.error("CLERK ERROR", err); return { data: [] }; }),
    getCheckoutOptionsCatalog(),
    getBranchCountForOrg(orgId),
  ]);

  const publicMetadata = (org.publicMetadata || {}) as {
    description?: string;
    address?: string;
    phone?: string;
    bannerUrl?: string;
    stockAllocationMode?: 'target_branch' | 'central_intake';
    checkout_options?: Record<string, boolean>;
  };
  const bankDetails = parseBankDetailsFromClerkOrg(org);
  const metadata = {
    ...publicMetadata,
    ...bankDetailsToProfileFormFields(bankDetails),
  };
  const memberships = membershipsResponse.data;

  // Calculate administrative metrics
  const totalMembers = memberships.length;
  const adminCount = memberships.filter((m) => m.role === 'org:admin').length;
  const memberCount = memberships.filter((m) => m.role === 'org:member').length;

  // Track profile setup completion percentage
  let fieldsChecked = 0;
  let fieldsCompleted = 0;
  const checkFields = ['description', 'address', 'phone', 'bannerUrl', 'stockAllocationMode'];
  checkFields.forEach((f) => {
    fieldsChecked++;
    if (metadata[f as keyof typeof metadata]) {
      fieldsCompleted++;
    }
  });
  const completionPercent = Math.round((fieldsCompleted / fieldsChecked) * 100);
  const bankTransferConfigured = hasBankTransferConfiguredForOrg(org);
  const checkoutOptions = metadata.checkout_options || {};
  const hasSavedCheckoutOptions = Object.values(checkoutOptions).some((enabled) => enabled === true);



  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto font-sans">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 mb-2">
              🛡️ Organization Admin
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Admin & Members Console
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
              Configure details and manage members for <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{org.name}</strong>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {org.slug && (
              <Link
                href={`/vendors/${org.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center min-h-[44px] sm:min-h-0 flex items-center justify-center text-sm sm:text-xs font-semibold px-4 sm:px-3 py-2 rounded-lg border border-purple-200 hover:bg-purple-50 dark:border-purple-900/50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 transition-colors shadow-sm"
              >
                View Storefront ↗
              </Link>
            )}
            <Link
              href="/vendor"
              className="text-center min-h-[44px] sm:min-h-0 flex items-center justify-center text-sm sm:text-xs font-semibold px-4 sm:px-3 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm"
            >
              &larr; Storefront Console
            </Link>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />



        {/* Enterprise Administrative KPIs Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3 sm:p-4 dark:bg-zinc-900/20 dark:border-zinc-900 text-center relative group">
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Total Staff</p>
            <h4 className="text-xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">{totalMembers}</h4>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3 sm:p-4 dark:bg-zinc-900/20 dark:border-zinc-900 text-center relative group">
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Admins</p>
            <h4 className="text-xl font-extrabold font-mono mt-1 text-red-650 dark:text-red-400">{adminCount}</h4>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3 sm:p-4 dark:bg-zinc-900/20 dark:border-zinc-900 text-center relative group">
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Members</p>
            <h4 className="text-xl font-extrabold font-mono mt-1 text-indigo-650 dark:text-indigo-400">{memberCount}</h4>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3 sm:p-4 dark:bg-zinc-900/20 dark:border-zinc-900 text-center relative group flex flex-col justify-center items-center">
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Setup Progress</p>
            <span className="text-sm font-bold font-mono mt-1 text-purple-700 dark:text-purple-400">{completionPercent}% Complete</span>
            <div className="w-full max-w-[80px] bg-zinc-200 dark:bg-zinc-800 rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-purple-650 h-1 rounded-full transition-all duration-500" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Metadata Settings Form */}
        <div className="space-y-6 mb-8 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-sans">Public Page Setup</h3>
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                completionPercent === 100
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
              }`}>
                {completionPercent === 100 ? 'Completed' : 'Pending Fields'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Storefront fields are saved to public organization metadata. Bank transfer details are stored privately and are only visible to organization admins.
            </p>
          </div>

          <VendorProfileForm orgId={orgId} initialMetadata={metadata} isAdmin={true} />
        </div>

        {/* Checkout Options */}
        <div className="space-y-6 mb-8 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-sans">Checkout Options</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Enable store pickup, bank transfer, and other checkout methods for customers buying from your organization.
            </p>
          </div>
          <OrgCheckoutOptionsForm
            orgId={orgId}
            catalog={checkoutOptionsCatalog}
            initialOptions={metadata.checkout_options || {}}
            branchCount={branchCountRow}
            bankTransferConfigured={bankTransferConfigured}
            addressConfigured={Boolean(metadata.address?.trim())}
          />
        </div>

        {/* Members Management Console */}
        {memberships.length > 0 && (
          <div className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-sans">Organization Members Console</h3>
              <p className="text-xs text-zinc-450 mt-0.5 leading-relaxed">
                Manage member roles and permissions inside this active organization.
              </p>
            </div>
            
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden mt-4">
              {memberships.map((m) => {
                const memberUserId = m.publicUserData?.userId;
                if (!memberUserId) return null;

                const email = m.publicUserData?.identifier || 'No email';
                const fullName = [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
                const memberRole = m.role;
                const avatarUrl = m.publicUserData?.imageUrl;

                return (
                  <div key={m.id} className="flex flex-col gap-3 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt={fullName} width={40} height={40} className="w-10 h-10 rounded-full border border-zinc-200/40 object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0 font-mono">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <span className="block font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{fullName}</span>
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">{email}</span>
                        </div>
                      </div>
                      {memberUserId === user?.id && (
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 font-mono font-bold flex-shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
                      <p className="text-[10px] text-zinc-400 font-mono uppercase mb-1.5 tracking-wider font-semibold">Role & Permissions</p>
                      <RoleSelector orgId={orgId} userId={memberUserId} currentRole={memberRole} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/10 dark:bg-zinc-900/5 mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-450 font-mono uppercase text-[9px] bg-zinc-50/50 dark:bg-zinc-900/30">
                    <th className="py-3 px-4 font-semibold">Member Details</th>
                    <th className="py-3 px-4 font-semibold">Email Address</th>
                    <th className="py-3 px-4 font-semibold">User ID</th>
                    <th className="py-3 px-4 font-semibold">Organization Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-900">
                  {memberships.map((m) => {
                    const memberUserId = m.publicUserData?.userId;
                    if (!memberUserId) return null;

                    const email = m.publicUserData?.identifier || 'No email';
                    const fullName = [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
                    const memberRole = m.role;
                    const avatarUrl = m.publicUserData?.imageUrl;

                    return (
                      <tr key={m.id} className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                          {avatarUrl ? (
                            <Image src={avatarUrl} alt={fullName} width={32} height={32} className="w-8 h-8 rounded-full border border-zinc-200/40 object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 font-mono">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate min-w-0">
                            <span className="block font-bold truncate">{fullName}</span>
                            {memberUserId === user?.id && (
                              <span className="inline-block mt-0.5 text-[8px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 font-mono">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                          {email}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 dark:text-zinc-650 font-mono text-[9px]">
                          {memberUserId}
                        </td>
                        <td className="py-3 px-4">
                          <RoleSelector orgId={orgId} userId={memberUserId} currentRole={memberRole} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
