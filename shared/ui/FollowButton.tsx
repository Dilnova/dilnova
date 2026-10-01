"use client";

import { usePathname } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { getSafeRedirectUrl } from "@/shared/security/redirect";

interface FollowButtonProps {
  orgName: string;
  redirectUrl?: string;
}

export default function FollowButton({ orgName, redirectUrl }: FollowButtonProps) {
  const pathname = usePathname();
  const effectiveRedirectUrl = getSafeRedirectUrl(
    redirectUrl ?? (pathname && pathname !== "/" ? pathname : "/"),
  );

  return (
    <SignInButton mode="modal" forceRedirectUrl={effectiveRedirectUrl}>
      <button
        type="button"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-4 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-purple-900/10"
        title={`Sign in to follow ${orgName}`}
      >
        Follow Vendor
      </button>
    </SignInButton>
  );
}
