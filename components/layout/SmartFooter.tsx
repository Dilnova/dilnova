'use client';

import { usePathname } from 'next/navigation';

export default function SmartFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide global website footer on dedicated POS billing register pages
  if (pathname?.startsWith('/vendor/billing')) {
    return null;
  }

  return <>{children}</>;
}
