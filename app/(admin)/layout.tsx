import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  if (!orgId || orgRole !== 'org:admin') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
