"use client";

import { SignInButton } from "@clerk/nextjs";
import { Spinner } from "@/shared/ui/loading";

interface CartSendToInboxCardProps {
  isSignedIn: boolean;
  authRedirectUrl: string | null;
  handleSendInbox: (e: React.FormEvent) => void;
  emailStatus: string;
  cartCount: number;
  userEmail?: string | null;
}

export function CartSendToInboxCard({
  isSignedIn,
  authRedirectUrl,
  handleSendInbox,
  emailStatus,
  cartCount,
  userEmail,
}: CartSendToInboxCardProps) {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm space-y-4">
      <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
        Send Cart to Inbox
      </h2>

      {!isSignedIn ? (
        <div className="space-y-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Sign in to email a summary of your cart items to your account address.
          </p>
          <SignInButton mode="modal" forceRedirectUrl={authRedirectUrl ?? "/cart"}>
            <button
              type="button"
              className="w-full text-center py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
            >
              Sign In to Email Summary
            </button>
          </SignInButton>
        </div>
      ) : (
        <form onSubmit={handleSendInbox} className="space-y-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Email the list of these {cartCount} items to your registered address.
          </p>

          <div className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900 truncate">
            📧 {userEmail}
          </div>

          <button
            type="submit"
            disabled={emailStatus === "sending"}
            className="w-full text-center py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 disabled:cursor-not-allowed text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {emailStatus === "sending" ? (
              <>
                <Spinner size="sm" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Email Summary</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
