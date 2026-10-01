"use client";

import SafeProgressBar from "@/shared/ui/SafeProgressBar";

interface WizardStepIndicatorProps {
  orgName?: string;
  currentProgressPercent: number;
  currentStep: number;
  onSelectStep: (step: number) => void;
  onClose: () => void;
}

export default function WizardStepIndicator({
  orgName,
  currentProgressPercent,
  currentStep,
  onSelectStep,
  onClose,
}: WizardStepIndicatorProps) {
  const steps = [
    { number: 1, label: "Profile" },
    { number: 2, label: "Currency" },
    { number: 3, label: "Checkout Options" },
    { number: 4, label: "Final Review" },
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 px-6 py-6 text-white relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 rounded-full h-8 w-8 flex items-center justify-center text-base font-bold transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          ✕
        </button>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
            {orgName || "Organization"} Setup Wizard
          </span>
        </div>
        <h2 id="onboarding-modal-title" className="text-2xl font-black tracking-tight">
          Complete Mandatory Details
        </h2>
        <p className="text-xs text-purple-200 mt-1 max-w-lg">
          Configure your store profile, currency, and checkout options for customers.
        </p>

        {/* Stepper Progress Bar */}
        <div className="mt-4 pt-3 border-t border-purple-800/60 flex items-center gap-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-purple-950/80 border border-purple-700/50">
            <SafeProgressBar
              percent={currentProgressPercent}
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300 rounded-full"
            />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-300 shrink-0">
            {currentProgressPercent}% Done
          </span>
        </div>
      </div>

      {/* Step Tabs Header */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-3 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectStep(s.number)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  currentStep === s.number
                    ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px]">
                  {s.number}
                </span>
                <span>{s.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <span className="text-zinc-300 dark:text-zinc-700">&rarr;</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
