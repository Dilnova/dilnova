import Link from 'next/link';
import type { Metadata } from 'next';
import { getSystemSetting } from '@/shared/platform/settings';

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  return {
    title: `Refund & Return Policy | ${systemName}`,
    description: `Refund and Return Policy for the ${systemName} Multi-Vendor Commerce Marketplace. Learn about our return windows, vendor-specific policies, and dispute resolution.`,
  };
}
export const revalidate = 86400;

export default async function RefundPolicy() {
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
            Refund & Return Policy
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
            Last Updated: June 19, 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-650 dark:text-zinc-400">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. Multi-Vendor Marketplace Structure
            </h2>
            <p>
              <strong>{systemName}</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates as a multi-vendor marketplace. This means that while you check out through our unified portal, your items are sold and fulfilled by independent merchants (vendors). 
            </p>
            <p>
              Each vendor may have their own specific return and refund guidelines. However, we mandate a baseline minimum standard that all vendors must follow to ensure customer protection.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. Standard 14-Day Return Window
            </h2>
            <p>
              Unless explicitly stated otherwise on the product page, customers have the right to request a return or refund within <strong>14 days</strong> of receiving their order. To be eligible for a return, the item must be:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Unused and in the same condition that you received it.</li>
              <li>In its original packaging, with all tags and accessories included.</li>
              <li>Accompanied by a receipt or proof of purchase.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. Non-Returnable Items
            </h2>
            <p>
              Certain types of goods cannot be returned, regardless of the 14-day window. These include, but are not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Perishable goods (e.g., food, flowers, plants).</li>
              <li>Customized, bespoke, or personalized products.</li>
              <li>Digital downloads and software licenses once accessed or downloaded.</li>
              <li>Intimate or sanitary goods, hazardous materials, or flammable liquids/gases.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. How to Request a Refund
            </h2>
            <p>
              To initiate a return or refund, please follow these steps:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Contact the specific vendor directly through your Order History dashboard or the contact information provided on the vendor&apos;s storefront.</li>
              <li>Provide your order number and the reason for the return request.</li>
              <li>Wait for the vendor to approve the request and provide return shipping instructions.</li>
            </ol>
            <p>
              Please note that unless the item arrived damaged or defective, the customer is generally responsible for paying return shipping costs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. Dispute Resolution
            </h2>
            <p>
              If a vendor fails to adhere to our baseline return policy or you are unable to reach a satisfactory resolution with the merchant directly, <strong>{systemName}</strong> offers a dispute mediation service.
            </p>
            <p>
              You can escalate an issue to our support team within 30 days of the original purchase. We will review the communication between you and the vendor and may issue a refund on the vendor&apos;s behalf if we determine the vendor violated our marketplace standards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. Processing Times
            </h2>
            <p>
              Once your return is received and inspected by the vendor, we will notify you of the approval or rejection of your refund. If approved, the refund will be processed back to your original method of payment (or via bank transfer for manual payments). Please allow up to 5-10 business days for the funds to reflect in your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Contact Information
            </h2>
            <p>
              For any questions regarding our general Refund &amp; Return Policy, or to escalate a dispute with a vendor, please contact us at <a href="mailto:info@dilstar.pp.ua" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">info@dilstar.pp.ua</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
