"use client";

import SuperadminFormCard from "../../ui/SuperadminFormCard";

interface GeneralSettingsSectionProps {
  systemNameInput: string;
  setSystemNameInput: (val: string) => void;
  mediaLimitInput: number;
  setMediaLimitInput: (val: number) => void;
}

export default function GeneralSettingsSection({
  systemNameInput,
  setSystemNameInput,
  mediaLimitInput,
  setMediaLimitInput,
}: GeneralSettingsSectionProps) {
  return (
    <>
      {/* Application Name */}
      <SuperadminFormCard title="Application Name" icon="🏷️" className="space-y-3">
        <input
          type="text"
          required
          maxLength={100}
          value={systemNameInput}
          onChange={(e) => setSystemNameInput(e.target.value)}
          className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
          placeholder="e.g. Dilnova Hub"
        />
        <p className="text-[10px] text-zinc-400">
          The global display name of the application, used in header titles, layouts, metadata, and
          automated emails.
        </p>
      </SuperadminFormCard>

      {/* Media Limit */}
      <SuperadminFormCard title="Media Upload Limit" icon="📊" className="space-y-3">
        <input
          type="number"
          min="1"
          max="20"
          inputMode="numeric"
          required
          value={mediaLimitInput}
          onChange={(e) => setMediaLimitInput(parseInt(e.target.value, 10) || 1)}
          className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
        />
        <p className="text-[10px] text-zinc-400">Max images/videos per product listing (1–20).</p>
      </SuperadminFormCard>
    </>
  );
}
