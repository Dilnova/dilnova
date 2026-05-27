import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const userRole = user?.publicMetadata?.role as string | undefined;

  // Only user-level role 'admin' is authorized as Superadmin
  if (userRole !== 'admin') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
