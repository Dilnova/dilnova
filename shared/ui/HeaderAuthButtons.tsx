"use client";

import React from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useClerkAuthRedirectUrl } from "@/features/auth/hooks/use-clerk-auth-redirect-url";

const SignInTriggerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
  <button
    {...props}
    ref={ref}
    className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
  >
    Sign In
  </button>
));
SignInTriggerButton.displayName = "SignInTriggerButton";

const SignUpTriggerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
  <button
    {...props}
    ref={ref}
    className="bg-purple-700 text-white rounded-lg h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 text-[11px] sm:text-xs cursor-pointer hover:bg-purple-800 transition-colors whitespace-nowrap"
  >
    Sign Up
  </button>
));
SignUpTriggerButton.displayName = "SignUpTriggerButton";

export default function HeaderAuthButtons() {
  const redirectUrl = useClerkAuthRedirectUrl();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-xs font-semibold">
      <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
        <SignInTriggerButton />
      </SignInButton>
      <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
        <SignUpTriggerButton />
      </SignUpButton>
    </div>
  );
}
