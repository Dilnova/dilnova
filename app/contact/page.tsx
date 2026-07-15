import { getSystemSetting } from '@/shared/platform/settings';
import ContactClientPage from '@/features/contact/components/ContactClientPage';

export const revalidate = 3600; // Revalidate every hour to catch system setting changes

export default async function ContactPage() {
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <ContactClientPage systemName={systemName} />
  );
}
