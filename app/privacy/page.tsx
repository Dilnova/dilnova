import Link from "next/link";
import type { Metadata } from "next";
import { getSystemSetting } from "@/shared/platform/settings";
import { DEFAULT_SUPPORT_EMAIL } from "@/shared/platform/brand";

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting("system_name", "Dilnova");
  return {
    title: `Privacy Policy | ${systemName}`,
    description: `Enterprise privacy policy for the ${systemName} Multi-Vendor Commerce Marketplace. Learn about our AES-256-GCM encryption, data retention, subprocessor governance, and GDPR/CCPA rights.`,
  };
}
export const revalidate = 86400;

export default async function PrivacyPolicy() {
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
            href="/terms"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Terms of Service
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <Link
            href="/cookie"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Cookie Policy
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <Link
            href="/privacy/subprocessors"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Subprocessors
          </Link>
        </div>

        {/* Title */}
        <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl mb-3">
            Privacy Policy
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
              1. Overview &amp; Data Controller
            </h2>
            <p>
              Welcome to <strong>{systemName}</strong> (&quot;Company&quot;, &quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;). We operate a multi-tenant commerce hub enabling
              independent vendor merchants to serve customers globally and locally.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              personal data when you visit our website, place orders across merchant storefronts, or
              interact with our platform. For the purposes of the General Data Protection Regulation
              (GDPR) and applicable data protection laws, <strong>{systemName}</strong> operates as
              the Data Controller for platform-level account and transaction data, and as a Data
              Processor on behalf of individual merchant organizations for tenant-specific catalog
              interactions.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. Data We Collect
            </h2>
            <p>We collect and process the following categories of personal information:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Identity &amp; Profile Data:</strong> Full name, email address, avatar, and
                authentication credentials managed securely via our identity provider (Clerk).
              </li>
              <li>
                <strong>Contact &amp; Delivery Information:</strong> Physical shipping address,
                billing address, postal code, city, country, and telephone contact numbers.
              </li>
              <li>
                <strong>Transactional &amp; Order Data:</strong> Item purchase history, order
                identifiers, subtotal allocations, delivery tracking details, and manual bank
                transfer deposit slips.
              </li>
              <li>
                <strong>Customer Support &amp; Inquiries:</strong> Communications submitted via our{" "}
                <Link
                  href="/contact"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Contact Support Form
                </Link>
                , feedback messages, and support chat transcripts.
              </li>
              <li>
                <strong>Technical &amp; Telemetry Data:</strong> IP addresses, browser user agent,
                operating system, and security audit logs captured automatically for cyber defense
                and rate limiting.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. Legal Bases for Processing (GDPR Article 6)
            </h2>
            <p>We process your personal data under the following recognized legal bases:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Contractual Necessity (Art. 6(1)(b)):</strong> To create user accounts,
                process shopping cart checkouts, verify payment slips, deliver orders, and provide
                order status notifications.
              </li>
              <li>
                <strong>Legal &amp; Regulatory Obligations (Art. 6(1)(c)):</strong> To maintain tax,
                accounting, and financial records, enforce consumer protection standards, and
                respond to lawful government requests.
              </li>
              <li>
                <strong>Legitimate Interests (Art. 6(1)(f)):</strong> To safeguard platform
                infrastructure against DDoS and fraudulent transactions, enforce edge rate limits,
                monitor application performance, and prevent multi-tenant data bleed.
              </li>
              <li>
                <strong>Consent (Art. 6(1)(a)):</strong> For optional performance analytics cookies
                and marketing communications, which can be modified or withdrawn at any time.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. Data Security &amp; Cryptographic Standards
            </h2>
            <p>
              We implement defense-in-depth security architectures to protect customer data from
              unauthorized access, alteration, or disclosure:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Field-Level Encryption:</strong> Sensitive personally identifiable
                information (such as customer email, phone numbers, and physical addresses) is
                encrypted at rest using industry-standard <strong>AES-256-GCM</strong> cryptography
                with authenticated tags.
              </li>
              <li>
                <strong>Transport Security:</strong> All web and API traffic is strictly enforced
                over <strong>TLS 1.3 / HTTPS</strong> with HSTS (Strict-Transport-Security) headers.
              </li>
              <li>
                <strong>Payment Isolation:</strong> We do not store raw credit card numbers or
                security PINs. Manual bank slips are stored in private cloud buckets accessible only
                through ephemeral signed URLs.
              </li>
              <li>
                <strong>Multi-Tenant Isolation:</strong> Database queries are programmatically
                isolated by tenant organization IDs at the ORM layer, preventing cross-organization
                information leaks.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. Cookies &amp; Tracking Consent
            </h2>
            <p>
              We prioritize transparency regarding tracking technologies. For full details on our
              strictly necessary session cookies and opt-in performance cookies, please review our
              dedicated{" "}
              <Link
                href="/cookie"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Cookie Policy
              </Link>
              . You may adjust or revoke non-essential cookie permissions at any time.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. GDPR &amp; CCPA Data Subject Rights
            </h2>
            <p>
              Depending on your jurisdiction (including the European Economic Area, United Kingdom,
              and California), you are entitled to the following statutory rights:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Right to Access &amp; Portability:</strong> You may request a complete,
                machine-readable export of all personal data held about you.
              </li>
              <li>
                <strong>Right to Rectification:</strong> You may correct inaccurate or incomplete
                personal information in your profile settings.
              </li>
              <li>
                <strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> You may
                request permanent deletion or anonymization of your PII from our databases and logs.
              </li>
              <li>
                <strong>Right to Restrict or Object to Processing:</strong> You may request that we
                pause or cease processing your data under certain conditions.
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> We will never discriminate against you
                for exercising any of your privacy rights.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please submit an inquiry through our{" "}
              <Link
                href="/contact"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Support Portal
              </Link>{" "}
              or email our Data Protection Officer directly at{" "}
              <a
                href={`mailto:${DEFAULT_SUPPORT_EMAIL}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                {DEFAULT_SUPPORT_EMAIL}
              </a>
              . We will acknowledge and process verified requests within 30 days.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Data Retention &amp; Deletion Schedules
            </h2>
            <p>
              We retain personal data only for as long as necessary to fulfill the purposes outlined
              in this policy:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Active Accounts:</strong> Retained for the duration of the account lifecycle
                until deletion is requested.
              </li>
              <li>
                <strong>Financial &amp; Order Records:</strong> Retained for a minimum of five (5)
                to seven (7) years to satisfy statutory tax, auditing, and corporate regulatory
                mandates.
              </li>
              <li>
                <strong>Security Audit Logs:</strong> Stored securely in tamper-evident logs for a
                standard period of 90 days before automated rotation and purging.
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              8. Subprocessors &amp; Cross-Border Transfers
            </h2>
            <p>
              To maintain global availability and enterprise reliability, {systemName} partners with
              vetted cloud infrastructure providers (including Clerk for identity, Supabase for
              encrypted database storage, Vercel for hosting, and Cloudinary for media assets).
            </p>
            <p>
              All subprocessors are bound by strict Data Processing Agreements (DPAs) incorporating
              European Commission Standard Contractual Clauses (SCCs). You can view the
              comprehensive list of providers, compliance certifications (SOC 2 Type 2), and data
              residency regions in our{" "}
              <Link
                href="/privacy/subprocessors"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Subprocessor Inventory
              </Link>
              .
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              9. Protection of Children&apos;s Privacy
            </h2>
            <p>
              Our Service is not directed to children under the age of 16 (or under 13 under the US
              Children&apos;s Online Privacy Protection Act [COPPA]). We do not knowingly collect or
              solicit personal information from minors. If we learn that we have inadvertently
              collected PII from a child without verified parental consent, we will promptly delete
              that data.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              10. Automated Decision-Making &amp; Profiling Disclosures
            </h2>
            <p>
              We do not use automated algorithms or profiling to make decisions that produce legal
              effects or significantly affect our users. Automated tools are strictly utilized for
              cybersecurity defense (e.g. edge rate limiters blocking abusive denial-of-service
              traffic).
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              11. Right to Lodge a Regulatory Complaint
            </h2>
            <p>
              If you believe our processing of your personal information infringes applicable data
              protection legislation, you have the right to lodge a formal complaint with your local
              supervisory authority (such as an EU Data Protection Authority or the relevant privacy
              commissioner in your jurisdiction).
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              12. Contact Information &amp; Data Protection Officer
            </h2>
            <p>
              For inquiries regarding this Privacy Policy, your personal data, or to reach our
              privacy team, please contact:
            </p>
            <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {systemName} Data Privacy Office
              </p>
              <p>Corporate Address: Colombo, Southern &amp; Western Province, Sri Lanka</p>
              <p>
                Email:{" "}
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
