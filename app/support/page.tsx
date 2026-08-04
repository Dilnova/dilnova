import { getSystemSetting } from "@/shared/platform/settings";
import ContactInteractiveForm from "@/features/contact/components/ContactInteractiveForm";
import SupportHubClient from "./SupportHubClient";
import { Suspense } from "react";
import type { Metadata } from "next";

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting("system_name", "Dilnova");
  return {
    title: `Help & Support Center | ${systemName}`,
    description:
      "Find instant answers to common questions about orders, billing, vendor onboarding, account security, and contact our dedicated support team.",
  };
}

export default async function SupportPage() {
  const systemName = await getSystemSetting("system_name", "Dilnova");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans relative overflow-hidden pb-20">
      {/* Background ambient light gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-10 md:pt-16">
        <SupportHubClient systemName={systemName}>
          <Suspense
            fallback={<div className="p-8 text-center text-zinc-400">Loading support form...</div>}
          >
            <ContactInteractiveForm systemName={systemName} />
          </Suspense>
        </SupportHubClient>
      </div>
    </div>
  );
}
