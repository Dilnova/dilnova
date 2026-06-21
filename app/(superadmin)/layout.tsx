import { redirect } from 'next/navigation';
import { getCurrentSuperAdminUser } from '@/shared/auth/superadmin-guard';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSuperAdminUser();
  if (!user) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
