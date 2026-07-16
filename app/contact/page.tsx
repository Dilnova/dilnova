import { getSystemSetting } from '@/shared/platform/settings';
import ContactClientPage from '@/features/contact/components/ContactClientPage';

import { Suspense } from 'react';

export const revalidate = 3600; // Revalidate every hour to catch system setting changes

export default async function ContactPage() {
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <Suspense>
      <ContactClientPage systemName={systemName} />
    </Suspense>
  );
}
