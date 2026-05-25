'use client';

import { useTransition } from 'react';
import { toggleUserRoleAction } from './actions';

interface RoleToggleButtonProps {
  currentRole: string | undefined;
}

export default function RoleToggleButton({ currentRole }: RoleToggleButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await toggleUserRoleAction(currentRole);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to toggle role');
      }
    });
  };

  const displayRole = currentRole || 'customer';

  return (
    <div className="flex flex-col items-center gap-3 p-5 bg-purple-50 border border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/50 rounded-2xl max-w-md mx-auto text-center shadow-sm">
      <div className="text-xs font-semibold text-purple-800 dark:text-purple-300">
        🛡️ Sandbox Testing Console
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
        Toggle your User-level RBAC role below to test Organization Creation permissions. Customers cannot create organizations, while Vendors can.
      </p>
      
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs font-mono text-zinc-650 dark:text-zinc-400">
          User Role: <strong className="uppercase text-purple-750 dark:text-purple-400 font-bold">{displayRole}</strong>
        </span>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="bg-purple-700 hover:bg-purple-850 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-colors shadow-sm"
        >
          {isPending ? 'Updating...' : `Switch to ${displayRole === 'vendor' ? 'Customer' : 'Vendor'}`}
        </button>
      </div>
    </div>
  );
}
