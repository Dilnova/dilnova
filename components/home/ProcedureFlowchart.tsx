"use client";

import { useState } from "react";
import {
  Store,
  Building2,
  FileText,
  MailCheck,
  KeyRound,
  ArrowRight,
  ChevronDown,
  CheckCircle,
} from "lucide-react";

interface StepItem {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  highlights: string[];
}

const storefrontSteps: StepItem[] = [
  {
    number: "01",
    title: "1. Choose Your Plan",
    subtitle: "Starter or Growth Plan",
    description:
      "Select the best plan for your online store with clear pricing and zero hidden fees.",
    icon: Store,
    badge: "Plan Choice",
    highlights: ["Clear transparent pricing", "No hidden setup fees"],
  },
  {
    number: "02",
    title: "2. Fill Simple Form",
    subtitle: "Mandatory Business Details",
    description:
      "Fill out the onboarding form with your required company info and submit your store inquiry.",
    icon: FileText,
    badge: "Business Info",
    highlights: ["Required business details", "Quick form submission"],
  },
  {
    number: "03",
    title: "3. Email & Review",
    subtitle: "Verification & Support",
    description:
      "Correspond directly via email with our support team to verify details and confirm your setup.",
    icon: MailCheck,
    badge: "Email Confirmation",
    highlights: ["Direct email communication", "Friendly team review"],
  },
  {
    number: "04",
    title: "4. Get App Access",
    subtitle: "Start Adding Products",
    description:
      "Receive your login credentials and gain immediate access to manage your store and products.",
    icon: KeyRound,
    badge: "Full App Access",
    highlights: ["Easy dashboard login", "Ready to sell online"],
  },
];

const enterpriseSteps: StepItem[] = [
  {
    number: "01",
    title: "1. Select Enterprise",
    subtitle: "Custom Marketplace Plan",
    description:
      "Pick our Enterprise plan for large multi-seller marketplaces, custom features, and dedicated support.",
    icon: Building2,
    badge: "Enterprise Choice",
    highlights: ["Custom tailored setup", "Dedicated support manager"],
  },
  {
    number: "02",
    title: "2. Submit Requirements",
    subtitle: "Business & Domain Info",
    description:
      "Provide your business profile, custom website address preferences, and submit your enterprise inquiry.",
    icon: FileText,
    badge: "Requirement Form",
    highlights: ["Custom web domain options", "Complete business profile"],
  },
  {
    number: "03",
    title: "3. Email Review Chain",
    subtitle: "Account Verification",
    description:
      "Exchange emails with our team to review requirements, set up your agreement, and confirm details.",
    icon: MailCheck,
    badge: "Team Consultation",
    highlights: ["Dedicated specialist review", "Simple agreement confirmation"],
  },
  {
    number: "04",
    title: "4. Platform Access",
    subtitle: "Full Admin Dashboard",
    description:
      "Get your admin login details to manage your complete marketplace, staff accounts, and custom web domain.",
    icon: KeyRound,
    badge: "Platform Access",
    highlights: ["Full admin dashboard", "Instant account activation"],
  },
];

export default function ProcedureFlowchart() {
  const [activeMode, setActiveMode] = useState<"storefront" | "enterprise">("storefront");
  const steps = activeMode === "storefront" ? storefrontSteps : enterpriseSteps;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20">
      {/* Top Banner & Interactive Mode Selector */}
      <div className="flex flex-col items-center justify-center gap-4 mb-10 text-center">
        {/* Horizontal Chain Summary Badge */}
        <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-500/20 text-xs font-bold text-zinc-700 dark:text-zinc-300 shadow-sm">
          <span>Choose Plan</span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
          <span>Fill Form</span>
          <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
          <span>Email & Review</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Get App Access</span>
        </div>

        {/* Tab Selector */}
        <div className="inline-flex p-1.5 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-300/50 dark:border-zinc-700/50 shadow-inner">
          <button
            onClick={() => setActiveMode("storefront")}
            type="button"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeMode === "storefront"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.02]"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Storefront Flow</span>
          </button>

          <button
            onClick={() => setActiveMode("enterprise")}
            type="button"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeMode === "enterprise"
                ? "bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-md scale-[1.02]"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Enterprise Marketplace Flow</span>
          </button>
        </div>
      </div>

      {/* Desktop Horizontal Left-to-Right Chain Diagram */}
      <div className="hidden lg:block relative py-4">
        {/* Continuous Left-to-Right Flow Line Connector */}
        <div className="absolute top-[4.25rem] left-[10%] right-[10%] h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full z-0 pointer-events-none opacity-80" />

        <div className="grid grid-cols-4 gap-6 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;

            return (
              <div
                key={step.number}
                className="group flex flex-col items-center text-center relative"
              >
                {/* Node Icon Box & Step Number Circle */}
                <div className="relative mb-6 z-10">
                  <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-indigo-500/40 dark:border-indigo-400/40 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-500/20 flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-500 group-hover:shadow-indigo-500/30">
                    <Icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 transition-transform duration-300 group-hover:rotate-6 mb-1" />
                    <span className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                      STEP {step.number}
                    </span>
                  </div>
                  {/* Subtle Glow behind icon */}
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Left-to-Right Arrow Badge between nodes */}
                {!isLast && (
                  <div className="absolute top-[2.25rem] -right-5 z-20 pointer-events-none flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-indigo-500/40 shadow-md text-indigo-600 dark:text-indigo-400">
                    <ArrowRight className="w-4 h-4 animate-pulse" />
                  </div>
                )}

                {/* Card Content */}
                <div className="w-full p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 backdrop-blur-sm shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:border-indigo-400/60 dark:group-hover:border-indigo-600/60 flex flex-col justify-between min-h-[230px]">
                  <div>
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {step.badge}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                      {step.title}
                    </h4>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                      {step.subtitle}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                      {step.description}
                    </p>
                  </div>

                  {/* Highlights list */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5 text-left">
                    {step.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile / Tablet Vertical Left-to-Right Chained Timeline */}
      <div className="block lg:hidden relative">
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-7 before:w-1 before:bg-gradient-to-b before:from-indigo-500 via-purple-500 to-emerald-500">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.number} className="relative flex items-start gap-4 pl-2">
                {/* Icon Circle */}
                <div className="relative z-10 shrink-0 w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-md">
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content Card */}
                <div className="flex-1 p-5 rounded-2xl bg-white/90 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Step {step.number}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {step.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {step.title}
                  </h4>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    {step.subtitle}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
                    {step.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    {step.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical down arrow between items */}
                {!isLast && (
                  <div className="absolute -bottom-4 left-6 translate-x-0 text-indigo-500 z-20 pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
