'use client';

import { SignInButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

interface FollowButtonProps {
  orgName: string;
}

export default function FollowButton({ orgName }: FollowButtonProps) {
  const pathname = usePathname();
  const redirectUrl = pathname && pathname !== '/' ? pathname : undefined;

  return (
    <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
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
