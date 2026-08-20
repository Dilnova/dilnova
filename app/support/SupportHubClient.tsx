"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SupportCategoryCards from "@/features/contact/components/SupportCategoryCards";
import SupportFAQAccordion from "@/features/contact/components/SupportFAQAccordion";

interface SupportHubClientProps {
  systemName: string;
  children: React.ReactNode;
}

export default function SupportHubClient({ systemName, children }: SupportHubClientProps) {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const faqSectionRef = useRef<HTMLDivElement>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (plan && ticketSectionRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      ticketSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [plan]);

  const handleCategorySelect = (catId: string | null) => {
    setSelectedCategory(catId);
    if (faqSectionRef.current) {
      faqSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTicketForm = () => {
    if (ticketSectionRef.current) {
      ticketSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Header & Search Bar */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All Systems Operational • Avg. Response &lt; 2 hrs</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          How can we help you today?
        </h1>
        <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Search our knowledge base for instant answers, explore popular topics, or connect directly
          with the {systemName} support team.
        </p>

        {/* Live Search Input */}
        <div className="relative max-w-2xl mx-auto pt-2">
          <div className="relative flex items-center">
            <div className="absolute left-4 text-zinc-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, questions, order tracking, payouts, billing..."
              className="w-full h-14 pl-12 pr-10 text-sm md:text-base rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-semibold p-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-400 dark:text-zinc-500">Popular:</span>
          <button
            onClick={() => {
              setSearchQuery("track");
              setSelectedCategory("orders");
            }}
            className="px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
          >
            Track Shipment
          </button>
          <button
            onClick={() => {
              setSearchQuery("refund");
              setSelectedCategory("billing");
            }}
            className="px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
          >
            Refund Policy
          </button>
          <button
            onClick={() => {
              setSearchQuery("register");
              setSelectedCategory("vendor");
            }}
            className="px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
          >
            Vendor Onboarding
          </button>
          <button
            onClick={scrollToTicketForm}
            className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 transition-colors"
          >
            Submit Ticket ↓
          </button>
        </div>
      </div>

      {/* Category Grid Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Browse Support Categories
          </h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Show all topics
            </button>
          )}
        </div>
        <SupportCategoryCards
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
      </section>

      {/* Knowledge Base & FAQs Section */}
      <section ref={faqSectionRef} className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {selectedCategory
                ? `Knowledge Base: ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`
                : "Frequently Asked Questions"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Showing answers for common questions and platform documentation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategory && (
              <span className="px-3 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:text-indigo-900 dark:hover:text-white"
                >
                  ✕
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5">
                Filter: &quot;{searchQuery}&quot;
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:text-purple-900 dark:hover:text-white"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>

        <SupportFAQAccordion selectedCategory={selectedCategory} searchQuery={searchQuery} />
      </section>

      {/* Direct Escalation / Support Channels & Ticket Form Section */}
      <section ref={ticketSectionRef} className="pt-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Still need assistance?
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Our support team is available Monday through Friday to help resolve your questions and
            provide technical guidance.
          </p>
        </div>

        {/* Support Direct Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Direct Email</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Send an email to our core team for general inquiries or corporate partnership
              requests.
            </p>
            <a
              href="mailto:info@dilstar.pp.ua"
              className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
            >
              info@dilstar.pp.ua →
            </a>
          </div>

          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
              Operating Hours
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Monday – Friday: 09:00 – 18:00 (GMT+5:30)
              <br />
              Weekend support on critical order issues.
            </p>
            <span className="inline-block text-xs font-semibold text-zinc-600 dark:text-zinc-300 pt-1">
              SLAs: Urgent &lt; 2h • Regular &lt; 24h
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
              Corporate Office
            </h3>
            <address className="not-italic text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                {systemName} Commerce Hub
              </p>
              <p>123 Commerce Avenue, Suite 400</p>
              <p>Colombo, 00100, Sri Lanka</p>
            </address>
          </div>
        </div>

        {/* Embedded Ticket Submission Form */}
        <div id="contact-form" className="pt-4">
          {children}
        </div>
      </section>
    </div>
  );
}
