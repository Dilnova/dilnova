import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgRole } = await auth();

  // Protect the entire route group: only customer, default member, or admin can pass
  const isAuthorized = orgId && (orgRole === 'org:customer' || orgRole === 'org:member' || orgRole === 'org:admin');
  if (!isAuthorized) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
