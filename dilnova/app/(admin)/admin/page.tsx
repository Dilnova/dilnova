import { auth, clerkClient } from '@clerk/nextjs/server';
import Link from 'next/link';
import RoleSelector from './RoleSelector';

export default async function AdminPage() {
  const { orgId, userId: callerUserId } = await auth();

  // Fetch the organization membership list from Clerk
  const client = await clerkClient();
  const membershipsResponse = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId!, // TS assertion because layout guarantees orgId exists
    limit: 100,
  });
  const memberships = membershipsResponse.data;

  return (
    <main className="p-8 max-w-6xl mx-auto font-sans">
      <div className="border border-zinc-200 rounded-xl p-8 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 mb-2">
              Organization Control
            </span>
            <h1 className="text-3xl font-bold tracking-tight">Organization Members Console</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Manage member roles and permissions inside this active organization.
            </p>
          </div>
          
          <Link
            href="/"
            className="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
          >
            &larr; Home Page
          </Link>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono text-xs uppercase">
                <th className="py-3 px-4 font-semibold">Member Name</th>
                <th className="py-3 px-4 font-semibold">Email Address</th>
                <th className="py-3 px-4 font-semibold">User ID</th>
                <th className="py-3 px-4 font-semibold">Organization Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {memberships.map((m) => {
                const userId = m.publicUserData?.userId;
                if (!userId) return null;

                const email = m.publicUserData?.identifier || 'No email';
                const fullName = [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
                const memberRole = m.role;

                return (
                  <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="py-4 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {fullName}
                      {userId === callerUserId && (
                        <span className="ml-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded px-1 py-0.5 font-mono">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                      {email}
                    </td>
                    <td className="py-4 px-4 text-zinc-400 dark:text-zinc-655 font-mono text-[10px]">
                      {userId}
                    </td>
                    <td className="py-4 px-4">
                      <RoleSelector orgId={orgId!} userId={userId} currentRole={memberRole} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {memberships.length === 0 && (
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-8 font-mono text-sm">
            No organization members found.
          </p>
        )}
      </div>
    </main>
  );
}
