"use client";

import { useState, useTransition } from "react";
import { updateOrganizationMemberRole } from "@/features/admin/actions";

interface RoleSelectorProps {
  orgId: string;
  userId: string;
  currentRole: string;
}

export default function RoleSelector({ orgId, userId, currentRole }: RoleSelectorProps) {
  const [role, setRole] = useState(currentRole || "org:member");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setRole(newRole);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateOrganizationMemberRole(orgId, userId, newRole);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to update organization member role",
        );
        setRole(currentRole || "org:member");
      }
    });
  };

  return (
    <div className="space-y-1 w-full sm:w-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
        <select
          value={role}
          onChange={handleChange}
          disabled={isPending}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-sm sm:text-xs font-mono bg-white border border-zinc-300 rounded-lg sm:rounded px-3 py-2 sm:px-2 sm:py-1 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-purple-500 disabled:opacity-50 transition-shadow shadow-sm"
        >
          <option value="org:member">org:member (Default Member)</option>
          <option value="org:admin">org:admin (Administrator)</option>
        </select>
        {isPending && (
          <span className="text-[10px] text-zinc-400 font-mono animate-pulse">saving...</span>
        )}
      </div>
      {errorMessage && (
        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-mono max-w-[220px]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
