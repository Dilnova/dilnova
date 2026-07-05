import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCachedUserRole, getCachedIsSuperAdmin } from '@/shared/auth/clerk-cache';

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const hasOrgAccess = orgId && (orgRole === 'org:member' || orgRole === 'org:admin');

  if (!hasOrgAccess) {
    // Allow global vendors/superadmins to access /vendor without an org (e.g. to create one)
    const [userRole, isSuperAdmin] = await Promise.all([
      getCachedUserRole(userId),
      getCachedIsSuperAdmin(userId),
    ]);
    const isGlobalVendor = userRole === 'vendor' || isSuperAdmin;
    if (!isGlobalVendor) {
      redirect('/unauthorized');
    }
  }

  return <>{children}</>;
}
