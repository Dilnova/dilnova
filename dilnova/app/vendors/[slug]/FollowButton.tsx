'use client';

interface FollowButtonProps {
  orgName: string;
}

export default function FollowButton({ orgName }: FollowButtonProps) {
  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-4 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-purple-900/10"
      onClick={() => alert(`Connecting with ${orgName}...`)}
    >
      Follow Vendor
    </button>
  );
}
