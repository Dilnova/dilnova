'use client';

import { useState, useTransition } from 'react';
import { updateOrganizationMemberRole } from './actions';

interface RoleSelectorProps {
  orgId: string;
  userId: string;
  currentRole: string;
}

export default function RoleSelector({ orgId, userId, currentRole }: RoleSelectorProps) {
  const [role, setRole] = useState(currentRole || 'org:member');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setRole(newRole);
    
    startTransition(async () => {
      try {
        await updateOrganizationMemberRole(orgId, userId, newRole);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update organization member role');
        setRole(currentRole || 'org:member');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={handleChange}
        disabled={isPending}
        className="text-xs font-mono bg-white border border-zinc-300 rounded px-2 py-1 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
      >
        <option value="org:member">org:member (Default Member)</option>
        <option value="org:admin">org:admin (Administrator)</option>
      </select>
      {isPending && (
        <span className="text-[10px] text-zinc-400 font-mono animate-pulse">
          saving...
        </span>
      )}
    </div>
  );
}
