import { getSystemSetting } from '@/shared/platform/settings';
import ContactClientPage from '@/features/contact/components/ContactClientPage';

export const revalidate = 0; // Fresh load on each visit

export default async function ContactPage() {
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <ContactClientPage systemName={systemName} />
  );
}
