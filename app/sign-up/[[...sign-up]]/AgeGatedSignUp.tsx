'use client';

import { SignUp } from '@clerk/nextjs';
import { useState } from 'react';
import Link from 'next/link';

export default function AgeGatedSignUp({ redirectUrl }: { redirectUrl?: string }) {
  const [agreed, setAgreed] = useState(false);

  if (agreed) {
    return <SignUp forceRedirectUrl={redirectUrl ?? '/'} />;
  }

  return (
    <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl shadow-zinc-200/20 dark:shadow-black/40 text-center space-y-6">
      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Age Verification Required</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          To comply with our <Link href="/terms" target="_blank" className="text-purple-600 dark:text-purple-400 hover:underline">Terms of Service</Link>, you must be <strong>18 years of age or older</strong> to create an account and transact on this marketplace.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={() => setAgreed(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold font-mono uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/10 text-sm"
        >
          I am 18 or older
        </button>
      </div>

      <div className="text-xs text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
        If you are under 18, you may not use this service. <Link href="/" className="text-zinc-600 dark:text-zinc-300 hover:underline font-semibold">Return to home</Link>.
      </div>
    </div>
  );
}
