import Link from 'next/link';
import type { Metadata } from 'next';
import { getSystemSetting } from '@/shared/platform/settings';

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  return {
    title: `Privacy Policy | ${systemName}`,
    description: `Privacy policy for the ${systemName} Multi-Vendor Commerce Marketplace. Learn about our encryption standard, data retention policies, and GDPR rights.`,
  };
}

export default async function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
            Last Updated: June 19, 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-650 dark:text-zinc-400">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. Overview & Scope
            </h2>
            <p>
              Welcome to the <strong>{systemName} Commerce Marketplace</strong>. We value your privacy and trust. This policy governs how we collect, process, secure, and store your personally identifiable information (PII) across all tenant storefronts, core portals, and services offered under the {systemName} hub.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. Data We Collect
            </h2>
            <p>
              We process data necessary to facilitate authentication, checkout processing, and customer inquiries:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account Credentials:</strong> Handled securely by our authentication partner (Clerk), including your name, email address, profile avatar, and system-assigned unique identifiers.
              </li>
              <li>
                <strong>Order Details:</strong> Customer name, shipping address, contact phone, and transaction history.
              </li>
              <li>
                <strong>Inquiries & Contact Submissions:</strong> Form contents, feedback details, name, and email address submitted via support forms.
              </li>
              <li>
                <strong>Technical Information:</strong> IP addresses and user agents logged dynamically for audit trails and cybersecurity incident response.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. Data Security & Encryption
            </h2>
            <p>
              To protect customer identity from leakage or breaches, we implement randomized encryption protocols:
            </p>
            <p>
              Sensitive customer properties (such as emails, phone numbers, and physical shipping addresses) are encrypted in our persistent database layers using standard <strong>AES-256-GCM</strong> cryptography. Only authenticated workflows and audit managers hold clearance to decrypt these data points.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. Cookies and Tracking Consent
            </h2>
            <p>
              We distinguish between essential and analytical cookies:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Strictly Necessary:</strong> Required for secure session tokens, Clerk auth state, and the persistent shopping cart. These do not require cookie consent and cannot be turned off.
              </li>
              <li>
                <strong>Performance & Analytics:</strong> Provided by Vercel Analytics and Vercel Speed Insights to help us optimize page load performance. These scripts are strictly disabled unless you click &quot;Accept All&quot; or toggle them to active in our cookie settings drawer.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. GDPR & CCPA Data Subject Rights
            </h2>
            <p>
              If you reside in the European Economic Area (EEA) or California, you are entitled to specific rights under the GDPR/CCPA regulations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Right to Access (Portability):</strong> You may request a complete export of all data stored relative to your identity.
              </li>
              <li>
                <strong>Right to be Forgotten (Erasure/Anonymization):</strong> You may request that we delete or permanently redact all PII associated with your account, orders, and inquiries.
              </li>
            </ul>
            <p>
              To execute these rights, you can submit a request directly through our support channels:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Submit a request using our <Link href="/contact" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">Contact Support Form</Link> and select the <strong>General Inquiry</strong> category.
              </li>
              <li>
                Or email our data protection administrators directly at <a href="mailto:info@dilstar.pp.ua" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">info@dilstar.pp.ua</a>.
              </li>
            </ul>
            <p>
              Upon verification of your identity, a platform superadmin will process your request (typically within 30 days). Fulfilling an erasure request permanently redacts your shipping address, phone number, name, and email from database logs, severing Clerk identity links.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. Data Retention
            </h2>
            <p>
              We retain account data and orders for as long as your account remains active or as needed to comply with financial audits. Audit logs are kept for a minimum of 90 days to meet operational compliance and forensic auditing requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Updates to This Policy
            </h2>
            <p>
              We reserve the right to modify this privacy policy at any time. Changes will be posted to this page with an updated timestamp. We encourage you to review this policy periodically.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
