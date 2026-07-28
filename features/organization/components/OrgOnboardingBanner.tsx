"use client";

import SafeProgressBar from "@/shared/ui/SafeProgressBar";
import type { OrgOnboardingStatus } from "@/features/organization/onboarding";

interface OrgOnboardingBannerProps {
  status: OrgOnboardingStatus;
  onOpenWizard: () => void;
  orgName?: string;
}

export default function OrgOnboardingBanner({
  status,
  onOpenWizard,
  orgName,
}: OrgOnboardingBannerProps) {
  if (status.isCompleted) {
    return null;
  }

  const missingLabels = status.mandatoryFields.filter((f) => !f.isComplete).map((f) => f.label);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:border-amber-900/50 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/40 p-4 sm:p-5 shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xl">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                Mandatory Setup Required
              </span>
              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                {status.completionPercent}% Completed
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
              Complete {orgName ? `${orgName}'s` : "Organization"} Setup
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Missing details:{" "}
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {missingLabels.join(" • ")}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWizard}
          className="shrink-0 min-h-[42px] px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Complete Setup Now</span>
          <span>&rarr;</span>
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center gap-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-950">
          <SafeProgressBar
            percent={status.completionPercent}
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 rounded-full"
          />
        </div>
        <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
          {status.mandatoryFields.filter((f) => f.isComplete).length} /{" "}
          {status.mandatoryFields.length}
        </span>
      </div>
    </div>
  );
}
