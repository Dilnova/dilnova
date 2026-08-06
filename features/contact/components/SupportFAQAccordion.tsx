"use client";

import { useState } from "react";

export interface FAQItem {
  id: string;
  category: "orders" | "billing" | "vendor" | "account" | "general";
  question: string;
  answer: string;
  tags: string[];
}

export const FAQ_DATA: FAQItem[] = [
  // Orders & Shipping
  {
    id: "order-tracking",
    category: "orders",
    question: "How can I track my order delivery?",
    answer:
      "You can track your order status in real time by navigating to your Account Customer Dashboard under 'My Orders', or by clicking the tracking link sent to your registered email address upon dispatch.",
    tags: ["track", "shipping", "delivery", "status", "order"],
  },
  {
    id: "order-modify",
    category: "orders",
    question: "Can I modify or cancel an order after placing it?",
    answer:
      "Orders can be modified or cancelled within 30 minutes of placement, provided the vendor has not already dispatched the package. Please contact our support team immediately with your Order ID.",
    tags: ["cancel", "change", "modify", "edit", "address"],
  },
  {
    id: "order-shipping-time",
    category: "orders",
    question: "What are the standard delivery timeframes?",
    answer:
      "Standard domestic delivery takes 2–4 business days. Express shipping options arrive within 1–2 business days. International delivery varies by destination region and customs processing.",
    tags: ["shipping", "time", "express", "delivery", "customs"],
  },
  {
    id: "order-missing",
    category: "orders",
    question: "What should I do if an item is missing or damaged?",
    answer:
      "If your order arrives incomplete or damaged, please submit a support request with your Order ID and photo evidence within 48 hours of delivery for immediate replacement or full refund.",
    tags: ["damaged", "missing", "broken", "return", "refund"],
  },

  // Billing & Refunds
  {
    id: "billing-payment-methods",
    category: "billing",
    question: "Which payment methods are accepted?",
    answer:
      "We accept Visa, MasterCard, American Express, Apple Pay, Google Pay, and localized multi-currency payments powered by secure Stripe & Cloudflare edge integration.",
    tags: ["payment", "credit card", "visa", "apple pay", "stripe"],
  },
  {
    id: "billing-refund-policy",
    category: "billing",
    question: "What is the platform refund policy?",
    answer:
      "Eligible items can be returned within 30 days of purchase for a full refund. Funds are credited back to your original payment method within 3–5 business days after inspection.",
    tags: ["refund", "policy", "return", "money back", "30 days"],
  },
  {
    id: "billing-fx-currency",
    category: "billing",
    question: "How are multi-currency conversions and FX rates calculated?",
    answer:
      "Prices are automatically converted based on real-time market foreign exchange rates. Transparency is guaranteed with clear FX markup breakdown presented prior to checkout.",
    tags: ["currency", "fx", "markup", "conversion", "exchange"],
  },
  {
    id: "billing-invoices",
    category: "billing",
    question: "Where can I download tax invoices?",
    answer:
      "Tax invoices and receipts are automatically emailed upon order completion and are permanently accessible from your Customer or Vendor Account Order History.",
    tags: ["invoice", "receipt", "vat", "tax", "download"],
  },

  // Vendor & Selling
  {
    id: "vendor-onboarding",
    category: "vendor",
    question: "How do I register as a Vendor on Dilnova?",
    answer:
      "Select 'Vendor Registration' in our support form or visit the Vendor Portal to complete our streamlined onboarding wizard, submit business credentials, and launch your digital store.",
    tags: ["vendor", "register", "join", "store", "sell"],
  },
  {
    id: "vendor-payouts",
    category: "vendor",
    question: "When and how are vendor payouts processed?",
    answer:
      "Vendor payouts are automatically disbursed on a weekly schedule directly into your registered bank account via secure automated clearing (ACH/Direct Deposit).",
    tags: ["payout", "earnings", "bank", "money", "commission"],
  },
  {
    id: "vendor-listings",
    category: "vendor",
    question: "Are there limits on product catalog uploads?",
    answer:
      "No! Active vendor accounts enjoy unlimited product listings, bulk CSV imports, variant configurations, and automated real-time inventory tracking.",
    tags: ["catalog", "products", "listing", "upload", "inventory"],
  },
  {
    id: "vendor-pos",
    category: "vendor",
    question: "Does the platform support Point-of-Sale (POS) integration?",
    answer:
      "Yes, Dilnova Commerce Hub includes a built-in multi-tenant POS terminal for physical retail stores with instant barcode scanning, stock synchronization, and offline resilience.",
    tags: ["pos", "point of sale", "retail", "storefront", "barcode"],
  },

  // Account & Security
  {
    id: "account-credentials",
    category: "account",
    question: "How do I update my profile or password?",
    answer:
      "Account security and single sign-on (SSO) are managed through Clerk RBAC. Click your profile avatar in the header to manage credentials, multi-factor authentication (MFA), and sessions.",
    tags: ["password", "account", "login", "clerk", "mfa", "security"],
  },
  {
    id: "account-privacy",
    category: "account",
    question: "How is my personal and customer data protected?",
    answer:
      "We strictly adhere to global privacy standards (GDPR/CCPA compliant). All sensitive stored PII is cryptographically hashed, and database transport is TLS encrypted.",
    tags: ["privacy", "gdpr", "data", "security", "encryption"],
  },
  {
    id: "account-roles",
    category: "account",
    question: "What organization roles exist on the platform?",
    answer:
      "We support Superadmin, Org Admin (full store control & member management), and Org Member (POS checkout & product additions) roles with strict multi-tenant authorization.",
    tags: ["roles", "rbac", "permissions", "organization", "admin"],
  },
];

interface SupportFAQAccordionProps {
  selectedCategory: string | null;
  searchQuery: string;
}

export default function SupportFAQAccordion({
  selectedCategory,
  searchQuery,
}: SupportFAQAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>("order-tracking");
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});

  const filteredFaqs = FAQ_DATA.filter((faq) => {
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;

    const matchesQuestion = faq.question.toLowerCase().includes(query);
    const matchesAnswer = faq.answer.toLowerCase().includes(query);
    const matchesTags = faq.tags.some((tag) => tag.toLowerCase().includes(query));

    return matchesCategory && (matchesQuestion || matchesAnswer || matchesTags);
  });

  const handleFeedback = (faqId: string, val: "yes" | "no") => {
    setFeedback((prev) => ({ ...prev, [faqId]: val }));
  };

  return (
    <div className="space-y-4">
      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20">
          <svg
            className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h4 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            No matching support topics found
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Try adjusting your search terms or select another category, or submit a support ticket
            below for direct help from our team.
          </p>
        </div>
      ) : (
        filteredFaqs.map((faq) => {
          const isOpen = expandedId === faq.id;

          return (
            <div
              key={faq.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? "bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-900/60 shadow-md ring-1 ring-indigo-500/10"
                  : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : faq.id)}
                className="w-full text-left p-6 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <span className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                    {faq.question}
                  </span>
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
                    isOpen
                      ? "rotate-180 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-4">
                  <p>{faq.answer}</p>

                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/50 text-xs text-zinc-400 dark:text-zinc-500 gap-2">
                    <div className="flex items-center gap-2">
                      <span>Tags:</span>
                      {faq.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <span>Was this helpful?</span>
                      {feedback[faq.id] ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Thank you!
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(faq.id, "yes")}
                            className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                          >
                            👍 Yes
                          </button>
                          <button
                            onClick={() => handleFeedback(faq.id, "no")}
                            className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                          >
                            👎 No
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
