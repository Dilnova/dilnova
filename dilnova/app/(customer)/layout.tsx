import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await auth();

  // Guard 1: User must be authenticated
  if (!userId) {
    redirect('/unauthorized');
  }

  // Guard 2: If user is acting under an active organization context,
  // enforce that their role is allowed (customer, member, or admin)
  if (orgId) {
    const isAuthorized = orgRole === 'org:member' || orgRole === 'org:admin';
    if (!isAuthorized) {
      redirect('/unauthorized');
    }
  }

  return <>{children}</>;
}
