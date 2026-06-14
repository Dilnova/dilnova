'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleWishlistAction } from '@/features/catalog/product-detail.actions';

interface WishlistRemoveButtonProps {
  productId: string;
}

export default function WishlistRemoveButton({ productId }: WishlistRemoveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await toggleWishlistAction(productId);
        router.refresh();
      } catch (err) {
        console.error('Failed to remove wishlist item', err);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      title="Remove from wishlist"
      aria-label="Remove from wishlist"
      className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
    >
      {isPending ? '…' : '×'}
    </button>
  );
}
