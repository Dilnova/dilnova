import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgRole } = await auth();

  // Protect the entire route group: only org:admin can pass
  if (!orgId || orgRole !== 'org:admin') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
