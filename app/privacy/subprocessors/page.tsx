import Link from 'next/link';
import type { Metadata } from 'next';
import { getSystemSetting } from '@/shared/platform/settings';

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  return {
    title: `Subprocessors | ${systemName}`,
    description: `Subprocessor inventory and vendor security assessments for the ${systemName} Multi-Vendor Commerce Marketplace.`,
  };
}
export const revalidate = 86400;

export default async function Subprocessors() {
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Privacy Policy
          </Link>
        </div>

        {/* Title */}
        <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl mb-3">
            Subprocessor Inventory & Vendor Security
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
            Last Updated: June 23, 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-650 dark:text-zinc-400">
          <section className="space-y-3">
            <p>
              To provide the <strong>{systemName} Commerce Marketplace</strong>, we engage certain third-party service providers (subprocessors) who process personal data on our behalf. We ensure that all our subprocessors maintain robust security postures and comply with applicable data protection laws, including the GDPR and CCPA.
            </p>
            <p>
              Below is the official register of our authorized third-party vendors, outlining their security certifications (e.g., SOC 2 Type 2), Data Processing Agreement (DPA) availability, and Data Residency.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Authorized Subprocessors</h2>
            
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-zinc-300 dark:divide-zinc-700">
                <thead className="bg-zinc-100 dark:bg-zinc-900">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:pl-6">Vendor</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Service Provided</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">SOC 2 Type 2</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">DPA / SCC Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Data Residency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950/50">
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Clerk</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Authentication & User Management</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">United States</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Supabase</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">PostgreSQL Database Services</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">AWS (US/EU Regions)</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Cloudinary</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Media CDN & Image Optimization</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Global CDN</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Upstash</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Redis Caching & Rate Limiting</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">AWS / GCP</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Vercel</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Edge Hosting & Analytics</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Global Edge Network</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Brevo</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">SMTP & Transactional Email</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">European Union (EU)</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Sentry</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Error Tracking & Monitoring</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">United States</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">Cloudflare</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Turnstile (Bot Protection)</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Maintained</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Executed</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">Global Edge Network</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 pt-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Security Assessments & Due Diligence
            </h2>
            <p>
              We conduct routine reviews of our vendors&apos; SOC 2 Type 2 compliance reports and data processing addendums (DPAs). Vendors are required to implement adequate technical and organizational measures to safeguard user data against unauthorized access, destruction, or alteration.
            </p>
            <p>
              To request a copy of our internal vendor risk assessment or specific compliance artifacts, please reach out via our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
