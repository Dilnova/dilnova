import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Return Policy | Dilstar & Dilnova",
  description:
    "Official Refund and Return Policy for Dilstar and Dilnova in Sri Lanka. Learn about our 7-day return window, in-store returns, and refund processing terms.",
};

export const revalidate = 86400;

export default function RefundPolicy() {
  const brandName = "Dilstar";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Store
          </Link>
        </div>

        {/* Title */}
        <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl mb-3">
            Refund &amp; Return Policy
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
            Last Updated: September 4, 2026 • Region: Sri Lanka
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-650 dark:text-zinc-400">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. Overview &amp; Applicable Region
            </h2>
            <p>
              This Refund &amp; Return Policy applies to all purchases made through{" "}
              <strong>{brandName}</strong> (accessible via <code>https://dilstar.pp.ua</code> and{" "}
              <code>https://dilnova.pp.ua</code>) and our physical store locations in{" "}
              <strong>Sri Lanka</strong>.
            </p>
          </section>

          {/* Section 2: Window & Condition */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. 7-Day Return Window &amp; Eligibility
            </h2>
            <p>
              We accept returns for <strong>both defective and non-defective products</strong>{" "}
              within <strong>7 days</strong> of receiving your order or completing your in-store
              purchase.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Product Condition:</strong> Items must be in <strong>new</strong> or{" "}
                <strong>slightly used</strong> condition, accompanied by all original packaging,
                accessories, and manuals.
              </li>
              <li>
                <strong>Proof of Purchase:</strong> A valid receipt or digital order confirmation
                from {brandName} is required.
              </li>
              <li>
                <strong>Defective Products:</strong> If an item arrives damaged or has a
                manufacturing defect, please notify us within 7 days of delivery to qualify for an
                immediate return inspection or exchange.
              </li>
            </ul>
          </section>

          {/* Section 3: Return Method & Fees */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. Return Method &amp; Restocking Fees
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Return Method:</strong> Returns must be brought <strong>in-store</strong> to
                our physical retail location:{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Dilstar, Ambalantota, Southern Province, Sri Lanka
                </span>
                .
              </li>
              <li>
                <strong>Restocking Fees:</strong> There is{" "}
                <strong>no restocking fee (No cost / 0 LKR)</strong> for returning items.
              </li>
            </ul>
          </section>

          {/* Section 4: Exchanges */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. Exchanges Policy
            </h2>
            <p>
              <strong>Product exchanges are not accepted.</strong> If you need a different model,
              size, or item, please return your original eligible product in-store for a refund and
              place a separate purchase for the new item.
            </p>
          </section>

          {/* Section 5: Processing Times */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. Refund Processing Time
            </h2>
            <p>
              Once your returned item is received and inspected at our Ambalantota store, your
              refund will be approved or rejected based on condition verification.
            </p>
            <p>
              Approved refunds will be processed back to your original payment method or via bank
              transfer within <strong>up to 30 days</strong>.
            </p>
          </section>

          {/* Section 6: Non-Returnable Goods */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. Non-Returnable Goods
            </h2>
            <p>
              Due to health, agricultural, or safety regulations, certain items cannot be returned
              under the 7-day policy:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Perishable flora or nursery saplings that have been replanted or altered.</li>
              <li>Customized, bespoke, or custom-cut hardware materials.</li>
              <li>Digital goods or software activation keys once revealed or redeemed.</li>
              <li>Hazardous liquids, opened adhesives, or chemical agents.</li>
            </ul>
          </section>

          {/* Section 7: Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Customer Support
            </h2>
            <p>
              For inquiries regarding returns or directions to our physical store, please contact:
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:info@dilstar.pp.ua"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                info@dilstar.pp.ua
              </a>
              <br />
              <strong>Store Location:</strong> Dilstar, Ambalantota, Sri Lanka
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
