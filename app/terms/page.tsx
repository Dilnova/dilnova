import Link from 'next/link';
import type { Metadata } from 'next';
import { getSystemSetting } from '@/shared/platform/settings';

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  return {
    title: `Terms of Service | ${systemName}`,
    description: `Terms of service and user agreements for the ${systemName} Multi-Vendor Commerce Marketplace.`,
  };
}
export const revalidate = 86400;

export default async function TermsOfService() {
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
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
            Back to Marketplace
          </Link>
        </div>

        {/* Title */}
        <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl mb-3">
            Terms of Service
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
            Last Updated: June 19, 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-650 dark:text-zinc-400">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the <strong>{systemName} Commerce Marketplace</strong> (the &quot;Service&quot;), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. User Accounts & Security
            </h2>
            <p>
              To browse products, make purchases, or create a vendor store, you must authenticate through our authentication provider (Clerk). You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Maintaining the confidentiality of your credentials.</li>
              <li>All activities that occur under your user identity.</li>
              <li>Providing accurate, current, and complete registration information.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. Multi-Vendor Marketplace Rules
            </h2>
            <p>
              {systemName} acts as a multi-tenant platform containing various independent vendor storefronts (e.g., botanical nurseries, tech stores, industrial hardware providers).
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Tenant Autonomy:</strong> Each vendor is solely responsible for their product listings, catalogs, descriptions, inventory accuracy, and localized delivery configurations.
              </li>
              <li>
                <strong>Tenant Separation:</strong> Customer orders and customer ownership are separated per tenant. You may purchase items from multiple stores via our unified cart, but fulfillment is handled by individual merchants.
              </li>
              <li>
                <strong>Merchant Conduct:</strong> Vendors must register matching corporate credentials, maintain accurate pricing, and avoid listing prohibited items or misrepresenting services.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. Payment & Subscriptions
            </h2>
            <p>
              Merchants can access advanced capabilities (such as listing items, priority placement, custom thematic styling) by subscribing to one of our commercial plans.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>All pricing plans are detailed on our platform and billed in accordance with the billing cycle chosen.</li>
              <li>Failure to maintain active payment status may result in suspension of storefront administration consoles.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. Intellectual Property
            </h2>
            <p>
              All core layouts, software designs, databases, and trademarks belonging to {systemName} Marketplace are protected under international copyright and trademark laws. Individual merchant branding, uploaded product images, and descriptions remain the intellectual property of the respective merchant tenant.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. Limitation of Liability
            </h2>
            <p>
              In no event shall the {systemName} Platform, its administrators, or its parent entity be liable for any indirect, incidental, special, consequential, or punitive damages arising from:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your use or inability to use the marketplace.</li>
              <li>Conduct, transactions, or communications of any merchant tenant on the platform.</li>
              <li>Any unauthorized access to, or modification of, your account data.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account or access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms of Service, is harmful to other users or merchants, or violates applicable local or federal laws.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
