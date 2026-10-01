import Link from "next/link";
import type { Metadata } from "next";
import { getSystemSetting } from "@/shared/platform/settings";
import { DEFAULT_SUPPORT_EMAIL } from "@/shared/platform/brand";

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting("system_name", "Dilnova");
  return {
    title: `Terms of Service | ${systemName}`,
    description: `Terms of service and user agreements for the ${systemName} Multi-Vendor Commerce Marketplace.`,
  };
}
export const revalidate = 86400;

export default async function TermsOfService() {
  const systemName = await getSystemSetting("system_name", "Dilnova");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Links */}
        <div className="mb-8 flex items-center gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Marketplace
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <Link
            href="/privacy"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <Link
            href="/refund"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Refund Policy
          </Link>
        </div>

        {/* Title */}
        <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl mb-3">
            Terms of Service
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
            Last Updated: October 1, 2026 • Effective Date: October 1, 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-650 dark:text-zinc-400">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. Acceptance of Terms &amp; Electronic Contracting
            </h2>
            <p>
              By accessing, browsing, registering for, or using the <strong>{systemName}</strong>{" "}
              platform, website, mobile interfaces, or associated merchant storefronts
              (collectively, the &quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, or
              &quot;our&quot;), you expressly acknowledge that you have read, understood, and agree
              to be bound by these Terms of Service and our accompanying{" "}
              <Link
                href="/privacy"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Privacy Policy
              </Link>
              ,{" "}
              <Link
                href="/cookie"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Cookie Policy
              </Link>
              , and{" "}
              <Link
                href="/refund"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Refund Policy
              </Link>
              .
            </p>
            <p>
              If you do not agree to these Terms of Service in their entirety, you must immediately
              discontinue access to and use of the Service. Your electronic interaction with the
              Service constitutes a legally binding agreement equivalent to a signed written
              contract.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. User Accounts, Authentication &amp; Eligibility
            </h2>
            <p>
              To browse products, complete orders, or register a vendor organization, you must
              authenticate through our secure identity provider (Clerk). By accessing or creating an
              account, you represent and warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                You are at least 18 years of age (or the legal age of majority in your jurisdiction)
                and possess full legal capacity to enter into binding agreements.
              </li>
              <li>
                All information provided during registration or checkout is accurate, truthful, and
                current.
              </li>
              <li>
                You will maintain the confidentiality and security of your account credentials,
                session tokens, and multi-factor authentication devices.
              </li>
              <li>
                You accept full legal and financial responsibility for all activities, transactions,
                and orders submitted under your account identity.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. Multi-Vendor Marketplace Model &amp; Merchant Autonomy
            </h2>
            <p>
              {systemName} operates as a multi-tenant commerce platform connecting independent
              vendor merchants with customers. Each vendor maintains autonomous operations within
              their designated tenant workspace:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Tenant Autonomy:</strong> Individual merchants are independent business
                entities responsible for their own product descriptions, stock levels, pricing,
                packaging, warranty terms, and order fulfillment.
              </li>
              <li>
                <strong>Multi-Tenant Order Isolation:</strong> Customer orders, cart allocations,
                and vendor catalogs are strictly isolated per tenant organization to preserve data
                privacy and fulfillment boundaries.
              </li>
              <li>
                <strong>Merchant Conduct &amp; Compliance:</strong> Merchants must maintain valid
                business credentials, adhere to fair trade practices, avoid prohibited merchandise,
                and honor stated delivery windows.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. Product Listings, Pricing, Taxes &amp; Availability
            </h2>
            <p>
              While merchants strive to maintain accurate catalog data, errors may occasionally
              occur:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Pricing &amp; Currency:</strong> Prices are quoted in the designated
                currency (such as Sri Lankan Rupees [LKR] or US Dollars [USD]) and may include
                applicable sales taxes or value-added taxes where specified by the merchant.
              </li>
              <li>
                <strong>Price Corrections:</strong> In the event of an obvious pricing typographical
                error or system glitch, the merchant and platform reserve the right to cancel or
                refund affected orders prior to fulfillment.
              </li>
              <li>
                <strong>Inventory Stock:</strong> Placing an item in your shopping cart does not
                guarantee stock reservation until checkout is confirmed and payment verification is
                completed.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. Orders, Payment Processing &amp; Subscriptions
            </h2>
            <p>
              Payments for goods and merchant subscription plans are processed through authorized
              gateways and verified manual settlement methods:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Bank Transfer Settlements:</strong> For manual bank transfer payments,
                customers must upload a legible, authentic deposit slip or digital transfer
                confirmation. Orders remain in pending verification status until the merchant
                reconciles the funds.
              </li>
              <li>
                <strong>Merchant Subscriptions:</strong> Merchants subscribing to tier upgrades,
                priority placement, or enhanced POS features agree to recurring billing terms
                specified at checkout. Non-payment may result in downgrading or suspension of
                administrative consoles.
              </li>
              <li>
                <strong>Payment Security:</strong> Payment card data is processed directly by
                PCI-DSS compliant payment gateways. {systemName} does not store raw payment card
                numbers or CVV codes on platform servers.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. Shipping, Delivery &amp; Risk of Loss
            </h2>
            <p>
              Delivery timeframes, carrier options, and shipping rates are determined by individual
              merchants based on geographic destination and product weight. Risk of loss and title
              for purchased items pass to the customer upon delivery by the carrier or physical
              collection at an authorized retail storefront.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Return &amp; Refund Policy
            </h2>
            <p>
              Returns, exchanges, and cancellations are governed by our official{" "}
              <Link
                href="/refund"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Refund &amp; Return Policy
              </Link>
              . For physical retail and defective items in Sri Lanka, a 7-day return inspection
              window applies from the date of product receipt. Non-defective items and customized
              orders are non-returnable.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              8. Acceptable Use Policy &amp; Prohibited Conduct
            </h2>
            <p>You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Using automated bots, scrapers, or extraction crawlers without prior written
                authorization.
              </li>
              <li>
                Attempting to bypass security controls, edge rate limiters, authentication guards,
                or content security policies (CSP).
              </li>
              <li>
                Submitting fraudulent payment slips, forged receipts, or unauthorized credit cards.
              </li>
              <li>Uploading malicious scripts, exploits, trojans, or corrupted media payloads.</li>
              <li>
                Engaging in price manipulation, denial-of-service (DDoS) attacks, or cross-tenant
                data probing.
              </li>
              <li>
                Listing counterfeit merchandise, controlled substances, or infringing intellectual
                property.
              </li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              9. Intellectual Property Rights &amp; DMCA Notices
            </h2>
            <p>
              All software architectures, user interfaces, logos, brand typography, graphics, and
              database designs of {systemName} are the exclusive intellectual property of the
              platform and protected under international copyright and trademark laws.
            </p>
            <p>
              Merchant trademarks, uploaded product photos, and catalog descriptions remain the
              intellectual property of the respective merchant tenant. If you believe any listing on
              the platform infringes your copyright or trademark, please contact our legal team at{" "}
              <a
                href={`mailto:${DEFAULT_SUPPORT_EMAIL}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                {DEFAULT_SUPPORT_EMAIL}
              </a>{" "}
              with proof of ownership and specific URL links.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              10. Disclaimer of Warranties
            </h2>
            <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono uppercase tracking-wide leading-relaxed text-zinc-700 dark:text-zinc-300">
              THE SERVICE, INCLUDING ALL MARKETPLACE PLATFORMS, CONTENT, MERCHANDISE, AND
              FUNCTIONALITY, IS PROVIDED STRICTLY ON AN &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. TO
              THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES,
              INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, TITLE, UNINTERRUPTED OPERATION, AND FREEDOM FROM COMPUTER VIRUSES OR
              HARMFUL COMPONENTS.
            </div>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              11. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall {systemName}, its
              founders, directors, employees, affiliates, or infrastructure providers be liable for
              any indirect, incidental, special, consequential, exemplary, or punitive damages
              (including loss of profits, goodwill, data, or business interruption) arising out of
              or in connection with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your use of, or inability to access or use, the marketplace platform.</li>
              <li>
                The conduct, statements, representations, or merchandise quality of any third-party
                merchant tenant.
              </li>
              <li>
                Unauthorized access to, alteration of, or breach of your account credentials or
                transmissions.
              </li>
              <li>
                Any total aggregate liability exceeding the greater of fifty US dollars (USD
                \$50.00) or the total fees paid by you to the platform in the preceding three (3)
                months.
              </li>
            </ul>
          </section>

          {/* Section 12 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              12. Indemnification
            </h2>
            <p>
              You agree to defend, indemnify, and hold harmless {systemName}, its parent entities,
              subsidiaries, officers, directors, agents, and employees from and against any claims,
              liabilities, damages, judgments, losses, costs, or expenses (including reasonable
              legal and attorney fees) arising out of your breach of these Terms of Service, your
              misuse of the Service, or your violation of any law or third-party rights.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              13. Account Termination &amp; Storefront Suspension
            </h2>
            <p>
              We reserve the absolute right to suspend or terminate your account, restrict your
              platform access, or delist vendor storefronts immediately, without prior notice or
              liability, if we determine in our sole discretion that you have violated these Terms
              of Service, engaged in fraudulent or deceptive practices, or endangered platform
              security.
            </p>
          </section>

          {/* Section 14 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              14. Governing Law &amp; Dispute Resolution
            </h2>
            <p>
              These Terms of Service and any disputes or claims arising out of or related to your
              use of the Service shall be governed by and construed in accordance with the
              substantive laws of the <strong>Democratic Socialist Republic of Sri Lanka</strong>,
              without giving effect to any conflict of law principles.
            </p>
            <p>
              You agree that any legal action, dispute, or court proceeding arising out of or
              relating to these terms shall be instituted exclusively in the competent courts
              located in <strong>Colombo, Sri Lanka</strong>, and you irrevocably submit to the
              personal jurisdiction of such courts.
            </p>
          </section>

          {/* Section 15 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              15. Severability &amp; Entire Agreement
            </h2>
            <p>
              If any provision of these Terms is determined by a court of competent jurisdiction to
              be unlawful, void, or unenforceable, such provision shall nonetheless be enforceable
              to the fullest extent permitted by applicable law, and the unenforceable portion shall
              be deemed severed from these Terms.
            </p>
            <p>
              These Terms of Service, together with our Privacy Policy, Cookie Policy, and Refund
              Policy, constitute the complete and exclusive agreement between you and {systemName}{" "}
              with respect to the subject matter hereof.
            </p>
          </section>

          {/* Section 16 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              16. Contact Information &amp; Legal Notices
            </h2>
            <p>
              For inquiries regarding these Terms of Service, legal compliance notices, or
              partnership agreements, please contact us at:
            </p>
            <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {systemName} Legal Operations
              </p>
              <p>Corporate Address: Colombo, Southern &amp; Western Province, Sri Lanka</p>
              <p>
                Email Support:{" "}
                <a
                  href={`mailto:${DEFAULT_SUPPORT_EMAIL}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  {DEFAULT_SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
