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

  const [userRole, isSuperAdmin] = await Promise.all([
    getCachedUserRole(userId),
    getCachedIsSuperAdmin(userId),
  ]);

  const isAuthorizedVendor = userRole === 'vendor' || isSuperAdmin;
  const hasOrgAccess = orgId && (orgRole === 'org:member' || orgRole === 'org:admin');

  if (!isAuthorizedVendor || !hasOrgAccess) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
