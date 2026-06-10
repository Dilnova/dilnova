import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import VendorProfileForm from '@/app/(vendor)/vendor/VendorProfileForm';
import RoleSelector from './RoleSelector';

export default async function AdminPage() {
  const { orgId, orgRole } = await auth();
  const user = await currentUser();

  if (!orgId) {
    throw new Error('No active organization detected.');
  }

  // Fetch current organization details (including metadata) from Clerk API
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const metadata = (org.publicMetadata || {}) as {
    description?: string;
    address?: string;
    phone?: string;
    bannerUrl?: string;
    stockAllocationMode?: 'target_branch' | 'central_intake';
  };

  // Fetch organization memberships
  let memberships: any[] = [];
  try {
    const membershipsResponse = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    memberships = membershipsResponse.data;
  } catch (err) {
    // Graceful degradation
  }

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans">
      <div className="border border-zinc-200 rounded-2xl p-8 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-md">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 mb-2">
              Organization Admin
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Admin & Members Console
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Configure details and manage members for <strong className="text-zinc-800 dark:text-zinc-250 font-semibold">{org.name}</strong>.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start">
            <Link
              href="/vendor"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              &larr; Storefront Console
            </Link>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

        {/* Info panel */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 mb-8 dark:bg-zinc-900/40 dark:border-zinc-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono">
            Active Identity Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            <div>
              <span className="text-zinc-400 block mb-0.5">Authorized Admin</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {user?.firstName} {user?.lastName || ''} ({user?.emailAddresses[0]?.emailAddress})
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Organization Context / Role</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase">
                {org.name} ({orgRole})
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Settings Form */}
        <div className="space-y-6 mb-8">
          <div>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Public Page Setup</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              These fields are saved to Clerk Organization Metadata. They will be displayed publicly on your store page at <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">/vendors/{org.slug || 'slug'}</code>.
            </p>
          </div>

          <VendorProfileForm orgId={orgId} initialMetadata={metadata} isAdmin={true} />
        </div>

        {/* Members Management Console */}
        {memberships.length > 0 && (
          <div className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <h3 className="text-lg font-bold text-zinc-855 dark:text-zinc-100 font-sans">Organization Members Console</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage member roles and permissions inside this active organization.
              </p>
            </div>
            
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono uppercase text-[9px] bg-zinc-50/50 dark:bg-zinc-900/30">
                    <th className="py-3 px-4 font-semibold">Member Name</th>
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

                    return (
                      <tr key={m.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {fullName}
                          {memberUserId === user?.id && (
                            <span className="ml-2 text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 font-mono">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                          {email}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 dark:text-zinc-655 font-mono text-[10px]">
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
