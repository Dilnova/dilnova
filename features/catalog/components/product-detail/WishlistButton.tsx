'use client';

import { useState, useTransition, useEffect } from 'react';
import { SignInButton, useAuth } from '@clerk/nextjs';
import { useClerkAuthRedirectUrl } from '@/features/auth/hooks/useClerkAuthRedirectUrl';
import { toggleWishlistAction } from '@/features/catalog/product-detail.actions';

interface WishlistButtonProps {
  productId: string;
  initialFavorited: boolean;
  isLoggedIn?: boolean;
  className?: string;
  showLabel?: boolean;
}

export default function WishlistButton({
  productId,
  initialFavorited,
  isLoggedIn: propsIsLoggedIn,
  className = '',
  showLabel = false,
}: WishlistButtonProps) {
  const { userId } = useAuth();
  const isLoggedIn = propsIsLoggedIn ?? !!userId;
  const redirectUrl = useClerkAuthRedirectUrl();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsFavorited(initialFavorited);
  }, [initialFavorited]);

  const buttonClassName = `group relative flex items-center justify-center gap-2 rounded-xl border transition-all duration-300 cursor-pointer ${
    isFavorited
      ? 'bg-red-50/80 border-red-200 text-red-500 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400'
      : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-350 dark:hover:border-zinc-700'
  } ${
    showLabel ? 'px-4 py-2.5 text-xs font-semibold' : 'p-2.5'
  } ${isPending ? 'opacity-70 cursor-not-allowed' : ''} ${className}`;

  const heartIcon = (
    <svg
      className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
        isFavorited ? 'fill-current scale-105' : 'fill-transparent'
      }`}
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn || isPending) return;

    // Optimistic UI update
    const previousState = isFavorited;
    setIsFavorited(!previousState);

    startTransition(async () => {
      try {
        const res = await toggleWishlistAction(productId);
        setIsFavorited(res.isFavorited);
      } catch (err) {
        console.error('Failed to toggle wishlist:', err);
        // Rollback state on error
        setIsFavorited(previousState);
      }
    });
  };

  if (!isLoggedIn) {
    return (
      <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={buttonClassName}
          title="Sign in to add to Wishlist"
        >
          {heartIcon}
          {showLabel && <span>Save to Wishlist</span>}
        </button>
      </SignInButton>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={buttonClassName}
      title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
    >
      {heartIcon}
      {showLabel && (
        <span>{isFavorited ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
      )}
    </button>
  );
}
