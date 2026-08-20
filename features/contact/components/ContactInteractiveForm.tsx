"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { submitContactFormAction } from "@/features/contact/actions";
import { toast } from "sonner";
import { Spinner } from "@/shared/ui/loading";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { useAutoRetryAction } from "@/shared/hooks/use-auto-retry-action";

export type CategoryType =
  "orders" | "billing" | "vendor" | "technical" | "collaboration" | "registration" | "info";

export type PlanTier = "starter" | "growth" | "enterprise";

export interface PlanConfig {
  id: PlanTier;
  name: string;
  price: string;
  period: string;
  badge?: string;
  description: string;
  category: CategoryType;
}

export const AVAILABLE_PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "For independent creators and hobbyists launching their first store.",
    category: "registration",
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: "$5",
    period: "/yearly",
    badge: "Popular",
    description: "For growing brands requiring advanced features and unlimited listings.",
    category: "registration",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    badge: "Scale",
    description: "For large organizations needing multiple stores & custom configurations.",
    category: "collaboration",
  },
};

function getSampleMessage(category: CategoryType, systemName: string) {
  if (category === "orders") {
    return `Hi ${systemName} support,\n\nI need assistance regarding my recent order. Please help me track the package or resolve a delivery issue.\n\nOrder ID: [Optional]\n\nThank you!`;
  }
  if (category === "billing") {
    return `Hi ${systemName} support,\n\nI have a question regarding a recent charge, payment receipt, or refund status on my account.\n\nThanks!`;
  }
  if (category === "vendor") {
    return `Hi ${systemName} support,\n\nI am a vendor managing my storefront catalog and would like assistance with catalog listings, payouts, or store settings.\n\nBest regards!`;
  }
  if (category === "technical") {
    return `Hi ${systemName} support,\n\nI experienced a technical issue or bug while navigating the platform. Here are the steps to reproduce the issue:\n\nThank you!`;
  }
  if (category === "collaboration") {
    return `Hi ${systemName} team,\n\nWe are interested in exploring a strategic technology integration or partnership with ${systemName}. Please connect us with a representative to discuss potential collaboration.\n\nThanks!`;
  }
  if (category === "registration") {
    return `Hi ${systemName} team,\n\nI would like to register my store on ${systemName} to manage products, inventory, and orders. Please guide me on the next steps to set up our storefront catalog.\n\nBest regards!`;
  }
  return `Hi ${systemName} team,\n\nI have a few questions regarding platform capabilities, pricing options, and system features. Could you please provide more details?\n\nThank you!`;
}

function getPlanMessage(planId: PlanTier, systemName: string) {
  if (planId === "starter") {
    return `Hi ${systemName} team,\n\nI would like to register my storefront on the Starter Plan ($0/month). Please guide me on the next steps to set up my catalog.\n\nThanks!`;
  }
  if (planId === "growth") {
    return `Hi ${systemName} team,\n\nI am interested in registering my storefront on the Growth Plan ($5/yearly) to upload unlimited listings. Please let me know how to get started.\n\nThanks!`;
  }
  if (planId === "enterprise") {
    return `Hi ${systemName} team,\n\nWe are looking to set up multiple storefront profiles with custom branding and priority support configurations. Please connect us with a representative to discuss the custom Enterprise Plan setup.\n\nThanks!`;
  }
  return `Hi ${systemName} team,\n\nI am interested in registering a new storefront on the marketplace. Please provide more details on how to get started.\n\nThanks!`;
}

function getPlanSubject(planId: PlanTier) {
  const planConfig = AVAILABLE_PLANS[planId];
  return `Inquiry for ${planConfig ? planConfig.name : planId} Plan Registration`;
}

function getCategorySubject(category: CategoryType) {
  switch (category) {
    case "collaboration":
      return "Partnership Proposal";
    case "registration":
      return "New Vendor Registration Inquiry";
    case "orders":
      return "Order & Delivery Support Request";
    case "billing":
      return "Billing & Refund Inquiry";
    case "vendor":
      return "Vendor Storefront Assistance";
    case "technical":
      return "Technical Support & Bug Report";
    case "info":
    default:
      return "General Information Request";
  }
}

function isKnownTemplate(msg: string) {
  if (!msg || msg.trim() === "") return true;
  if (
    msg.startsWith("Hi ") &&
    (msg.endsWith("Thanks!") || msg.endsWith("Best regards!") || msg.endsWith("Thank you!"))
  ) {
    return true;
  }
  return false;
}

interface ContactInteractiveFormProps {
  systemName: string;
}

export default function ContactInteractiveForm({ systemName }: ContactInteractiveFormProps) {
  const searchParams = useSearchParams();
  const rawPlanParam = searchParams.get("plan")?.toLowerCase() as PlanTier | undefined;
  const initialPlan: PlanTier | null =
    rawPlanParam && AVAILABLE_PLANS[rawPlanParam] ? rawPlanParam : null;

  const { user, isSignedIn, isLoaded } = useUser();
  const [isPending, startTransition] = useTransition();

  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(initialPlan);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    // Load Turnstile script dynamically
    const scriptId = "cloudflare-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    // Poll for Turnstile to load and render widget
    let checkCount = 0;
    let widgetId: string | null = null;
    const checkTurnstile = setInterval(() => {
      checkCount++;
      if (typeof window !== "undefined" && window.turnstile && turnstileRef.current) {
        clearInterval(checkTurnstile);
        try {
          if (turnstileRef.current.innerHTML === "") {
            widgetId = window.turnstile.render(turnstileRef.current, {
              sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
              callback: (token: string) => {
                setTurnstileToken(token);
              },
            });
          }
        } catch (err) {
          Sentry.captureException(err);
        }
      } else if (checkCount > 50) {
        // Stop polling after 5 seconds
        clearInterval(checkTurnstile);
      }
    }, 100);

    return () => {
      clearInterval(checkTurnstile);
      if (widgetId !== null && typeof window !== "undefined" && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const updateUrlPlan = (newPlan: PlanTier | null) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (newPlan) {
        params.set("plan", newPlan);
      } else {
        params.delete("plan");
      }
      const queryString = params.toString();
      const newUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    category: CategoryType;
    subject: string;
    message: string;
    middleName: string;
  }>(() => {
    let category: CategoryType = "info";
    let subject = "";
    let message = "";
    if (initialPlan) {
      const planConfig = AVAILABLE_PLANS[initialPlan];
      category = planConfig.category;
      subject = getPlanSubject(initialPlan);
      message = getPlanMessage(initialPlan, systemName);
    } else {
      subject = getCategorySubject("info");
      message = getSampleMessage("info", systemName);
    }
    return {
      name: "",
      email: "",
      category,
      subject,
      message,
      middleName: "",
    };
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userEmail = user.primaryEmailAddress?.emailAddress || "";
      const userName = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim();
      setFormData((prev) => ({
        ...prev,
        email: prev.email || userEmail,
        name: prev.name || userName,
      }));
    }
  }, [isLoaded, isSignedIn, user]);

  // Synchronize when searchParams change externally (e.g. browser back/forward)
  useEffect(() => {
    const currentParam = searchParams.get("plan")?.toLowerCase() as PlanTier | undefined;
    const validatedPlan = currentParam && AVAILABLE_PLANS[currentParam] ? currentParam : null;
    setSelectedPlan(validatedPlan);
    if (validatedPlan) {
      const targetCategory = AVAILABLE_PLANS[validatedPlan].category;
      setFormData((prev) => ({
        ...prev,
        category: targetCategory,
        subject: getPlanSubject(validatedPlan),
        message: isKnownTemplate(prev.message)
          ? getPlanMessage(validatedPlan, systemName)
          : prev.message,
      }));
    }
  }, [searchParams, systemName]);

  const handleSelectPlan = (planId: PlanTier | null) => {
    setSelectedPlan(planId);
    updateUrlPlan(planId);

    if (planId) {
      const planConfig = AVAILABLE_PLANS[planId];
      const targetCategory = planConfig.category;
      setFormData((prev) => {
        const shouldUpdateMessage = isKnownTemplate(prev.message);
        return {
          ...prev,
          category: targetCategory,
          subject: getPlanSubject(planId),
          message: shouldUpdateMessage ? getPlanMessage(planId, systemName) : prev.message,
        };
      });
    } else {
      setFormData((prev) => {
        const shouldUpdateMessage = isKnownTemplate(prev.message);
        return {
          ...prev,
          subject: getCategorySubject(prev.category),
          message: shouldUpdateMessage ? getSampleMessage(prev.category, systemName) : prev.message,
        };
      });
    }
  };

  const handleCategoryChange = (category: CategoryType) => {
    const isPlanCompatible =
      category === "registration" || category === "collaboration" || category === "vendor";

    if (!isPlanCompatible && selectedPlan) {
      // Switching to non-plan topics (Orders, Billing, Tech Support, Info) automatically clears the plan
      setSelectedPlan(null);
      updateUrlPlan(null);
    }

    setFormData((prev) => {
      const shouldUpdateMessage = isKnownTemplate(prev.message);
      const newSubject =
        !isPlanCompatible || !selectedPlan ? getCategorySubject(category) : prev.subject;
      const newMessage = shouldUpdateMessage
        ? !isPlanCompatible || !selectedPlan
          ? getSampleMessage(category, systemName)
          : getPlanMessage(selectedPlan, systemName)
        : prev.message;

      return {
        ...prev,
        category,
        subject: newSubject,
        message: newMessage,
      };
    });
  };

  const {
    execute: submitForm,
    isLoading: isAutoSubmitting,
    isRateLimited,
    countdownSeconds,
  } = useAutoRetryAction(
    async (submissionData: FormData) => {
      const result = await submitContactFormAction(null, submissionData);
      if (!result.success) {
        throw new Error(result.error || "Failed to submit contact form.");
      }
      return result;
    },
    {
      onSuccess: () => {
        toast.success("Thank you! Your message has been sent successfully.");
        setSelectedPlan(null);
        updateUrlPlan(null);
        setFormData({
          name: "",
          email: "",
          category: "info",
          subject: getCategorySubject("info"),
          message: getSampleMessage("info", systemName),
          middleName: "",
        });
        if (typeof window !== "undefined" && window.turnstile) {
          window.turnstile.reset();
          setTurnstileToken(null);
        }
      },
    },
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const submissionData = new FormData();
    submissionData.append("name", formData.name);
    submissionData.append("email", formData.email);
    submissionData.append("category", formData.category);
    submissionData.append("subject", formData.subject);
    submissionData.append("message", formData.message);
    submissionData.append("middleName", formData.middleName);
    if (turnstileToken) {
      submissionData.append("cf-turnstile-response", turnstileToken);
    }

    startTransition(async () => {
      await submitForm(submissionData);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Info cards: Left Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
            Choose a topic to learn more
          </h2>
          {selectedPlan && (
            <button
              type="button"
              onClick={() => handleSelectPlan(null)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Clear plan selection
            </button>
          )}
        </div>

        {/* Card 1: Collaboration */}
        <button
          type="button"
          onClick={() => handleCategoryChange("collaboration")}
          className={`text-left border p-6 rounded-2xl transition-all duration-200 cursor-pointer ${
            formData.category === "collaboration"
              ? "border-purple-500 bg-purple-500/5 shadow-md"
              : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-700 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50">
                  Collaborate with Us
                </h3>
                {formData.category === "collaboration" && selectedPlan === "enterprise" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    Enterprise
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Build integrations, co-market solutions, or join as a strategic technology partner.
                We love building together.
              </p>
            </div>
          </div>
        </button>

        {/* Card 2: Vendor Registration */}
        <button
          type="button"
          onClick={() => handleCategoryChange("registration")}
          className={`text-left border p-6 rounded-2xl transition-all duration-200 cursor-pointer ${
            formData.category === "registration"
              ? "border-purple-500 bg-purple-500/5 shadow-md"
              : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-700 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50">
                  Register Organization / Store
                </h3>
                {formData.category === "registration" && selectedPlan && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {AVAILABLE_PLANS[selectedPlan]?.name || selectedPlan} Plan
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Set up your storefront, manage products, handle orders, and expand your target
                audience using {systemName}’s commerce ecosystem.
              </p>
            </div>
          </div>
        </button>

        {/* Card 3: Info */}
        <button
          type="button"
          onClick={() => handleCategoryChange("info")}
          className={`text-left border p-6 rounded-2xl transition-all duration-200 cursor-pointer ${
            formData.category === "info"
              ? "border-purple-500 bg-purple-500/5 shadow-md"
              : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-700 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50 mb-1">
                General Inquiry / Info
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Have questions about platform pricing, security compliance, or how the commerce
                tools can help your specific workflow? Ask away.
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Form: Right Column */}
      <div className="lg:col-span-7">
        <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-xl transition-all duration-300">
          {/* Dynamic Active Plan Banner */}
          {selectedPlan && AVAILABLE_PLANS[selectedPlan] && (
            <div className="mb-6 p-4.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-zinc-900/60 border border-indigo-200/80 dark:border-indigo-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                      Selected Package Tier
                    </span>
                    {AVAILABLE_PLANS[selectedPlan].badge && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        {AVAILABLE_PLANS[selectedPlan].badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                    {AVAILABLE_PLANS[selectedPlan].name} Plan{" "}
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      ({AVAILABLE_PLANS[selectedPlan].price}
                      {AVAILABLE_PLANS[selectedPlan].period})
                    </span>
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* Segmented plan switcher */}
                <div className="inline-flex rounded-xl bg-white/80 dark:bg-zinc-900/80 p-1 border border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                  {(["starter", "growth", "enterprise"] as PlanTier[]).map((tierKey) => (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() => handleSelectPlan(tierKey)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedPlan === tierKey
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {AVAILABLE_PLANS[tierKey].name}
                    </button>
                  ))}
                </div>

                {/* Remove / Deselect Plan Button */}
                <button
                  type="button"
                  onClick={() => handleSelectPlan(null)}
                  title="Remove plan selection"
                  className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900 transition-colors cursor-pointer text-xs font-semibold flex items-center justify-center"
                >
                  <span className="sr-only">Clear plan</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200"
                />
              </div>
            </div>

            {/* Honeypot field (hidden from users, targeted at spam bots) */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="middleName" className="sr-only">
                Middle Name
              </label>
              <input
                type="text"
                id="middleName"
                name="middleName"
                tabIndex={-1}
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                autoComplete="off"
              />
            </div>

            <div className="space-y-3">
              <label
                htmlFor="category"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                Inquiry Type / Topic
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value as CategoryType)}
                className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200 cursor-pointer text-zinc-900 dark:text-zinc-100"
              >
                <option value="orders">Orders &amp; Delivery Support</option>
                <option value="billing">Billing &amp; Refund Inquiry</option>
                <option value="vendor">Vendor &amp; Store Partnership</option>
                <option value="technical">Technical Support &amp; Bug Report</option>
                <option value="collaboration">Collaborate with Us</option>
                <option value="registration">Register Organization / Store</option>
                <option value="info">General Inquiry / Learn More</option>
              </select>

              {/* Inline Plan Selector when in Store Registration or Collaboration mode */}
              {(formData.category === "registration" ||
                formData.category === "collaboration" ||
                formData.category === "vendor") && (
                <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      Package Tier Selection:
                    </span>
                    {selectedPlan && (
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(null)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Clear tier
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["starter", "growth", "enterprise"] as PlanTier[]).map((tierKey) => {
                      const item = AVAILABLE_PLANS[tierKey];
                      const isCurrent = selectedPlan === tierKey;
                      return (
                        <button
                          key={tierKey}
                          type="button"
                          onClick={() => handleSelectPlan(isCurrent ? null : tierKey)}
                          className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                            isCurrent
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500 shadow-xs"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                            {item.price}
                            {item.period}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2"
              >
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Inquiry subject..."
                className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="message"
                  className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                >
                  Message Description
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      message: selectedPlan
                        ? getPlanMessage(selectedPlan, systemName)
                        : getSampleMessage(prev.category, systemName),
                    }))
                  }
                  className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline cursor-pointer focus:outline-none"
                >
                  + Load Sample Template
                </button>
              </div>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe your inquiry in detail..."
                className="w-full p-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200 resize-none"
              />
            </div>

            {/* Sonner Toasts will handle feedback */}

            {/* Turnstile widget container */}
            <div className="flex justify-center my-4">
              <div ref={turnstileRef} />
            </div>

            <button
              type="submit"
              disabled={isPending || isAutoSubmitting || isRateLimited}
              className="w-full h-11 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending || isAutoSubmitting || isRateLimited ? (
                <>
                  <Spinner size="sm" />
                  <span>
                    {isRateLimited
                      ? `Processing... (Retrying in ${countdownSeconds}s)`
                      : "Sending Inquiry..."}
                  </span>
                </>
              ) : (
                <span>Send Inquiry</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
