import { getSystemSetting } from '@/shared/platform/settings';
import ContactInteractiveForm from '@/features/contact/components/ContactInteractiveForm';

import { Suspense } from 'react';

export const revalidate = 3600; // Revalidate every hour to catch system setting changes

export default async function ContactPage() {
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans px-4 py-12 md:py-20 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10 flex flex-col gap-10">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
            Connect with {systemName}
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Whether you want to partner, scale your business by registering as a vendor, or simply want to learn more, we are here to help.
          </p>
        </div>

        <Suspense>
          <ContactInteractiveForm systemName={systemName} />
        </Suspense>
      </div>
    </div>
  );
}
