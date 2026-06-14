'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { useClerkAuthRedirectUrl } from '@/features/auth/hooks/useClerkAuthRedirectUrl';

interface SignInPromptProps {
  message: string;
  className?: string;
}

export default function SignInPrompt({ message, className = '' }: SignInPromptProps) {
  const redirectUrl = useClerkAuthRedirectUrl();

  return (
    <div
      className={`border-t border-zinc-100 dark:border-zinc-900 pt-4 space-y-3 ${className}`}
    >
      <p className="text-xs text-zinc-450 dark:text-zinc-550 font-mono">{message}</p>
      <div className="flex flex-wrap items-center gap-2">
        <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
          <button
            type="button"
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-900/10 cursor-pointer"
          >
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
          <button
            type="button"
            className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Create Account
          </button>
        </SignUpButton>
      </div>
    </div>
  );
}
