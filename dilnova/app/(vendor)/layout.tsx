import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgRole } = await auth();

  // Protect the entire route group: only vendor, default member, or admin can pass
  const isAuthorized = orgId && (orgRole === 'org:vendor' || orgRole === 'org:member' || orgRole === 'org:admin');
  if (!isAuthorized) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
