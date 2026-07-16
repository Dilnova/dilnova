'use client';

import { logger } from '@/shared/logging/logger';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { submitReviewAction, getUserProductStateAction } from '@/features/catalog/product-detail.actions';
import Image from 'next/image';
import SignInPrompt from '@/shared/ui/SignInPrompt';
import { toast } from 'sonner';

interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string | null;
  userName: string;
  userImageUrl: string | null;
  createdAt: Date;
}

interface ReviewsSectionProps {
  productId: string;
  reviews: Review[];
  verifiedReviewerIds: string[];
  productOrgId: string;
}

export default function ReviewsSection({
  productId,
  reviews,
  verifiedReviewerIds,
  productOrgId,
}: ReviewsSectionProps) {
  const router = useRouter();
  const { userId, orgId: userOrgId } = useAuth();
  const isLoggedIn = !!userId;

  const { data: userState } = useSWR(
    userId ? ['product-state', productId] : null,
    () => getUserProductStateAction(productId)
  );

  const existingReview = userState?.existingReview || null;
  const userHasReviewed = userState?.userHasReviewed || false;
  const isVerifiedBuyer = userState?.isVerifiedBuyer || false;
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment ?? '');
    }
  }, [existingReview]);

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  const distribution = [0, 0, 0, 0, 0]; // Index 0 represents 1-star, Index 4 represents 5-star
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating - 1]++;
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }

    startTransition(async () => {
      try {
        await submitReviewAction(productId, rating, comment);
        toast.success(
          userHasReviewed
            ? 'Your review has been updated.'
            : 'Thank you! Your review has been submitted successfully.'
        );
        router.refresh();
      } catch (err) {
        logger.error('Error submitting review:', err);
        toast.error(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  };

  const isVendorOwner = productOrgId && userOrgId === productOrgId;
  const verifiedReviewerIdSet = new Set(verifiedReviewerIds);
  const canSubmitReview = isVerifiedBuyer || userHasReviewed;

  return (
    <div className="space-y-8 bg-white border border-zinc-200 rounded-3xl p-6 lg:p-10 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm mt-8">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Customer Reviews
        </h2>
        <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">
          Ratings & Feedback
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Statistics Columns (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          <div className="flex items-center gap-5">
            <div className="text-5xl font-black font-mono text-purple-700 dark:text-purple-400">
              {averageRating || '0.0'}
            </div>
            <div>
              <div className="flex items-center text-amber-400 mb-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(averageRating)
                        ? 'fill-current'
                        : 'fill-transparent stroke-current stroke-2'
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
                based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>

          {/* Distribution Bars */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution[stars - 1];
              const percentage = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs font-mono text-zinc-500">
                  <span className="w-12 text-right">{stars} star</span>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full dark:bg-zinc-900 overflow-hidden border border-zinc-200/20 dark:border-zinc-800/30">
                    <div
                      className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-left">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List Columns (7 cols) */}
        <div className="md:col-span-7 space-y-6 max-h-[450px] overflow-y-auto pr-2">
          {reviews.length === 0 ? (
            <div className="text-center py-10 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl dark:bg-zinc-900/10 dark:border-zinc-800">
              <span className="text-3xl">⭐</span>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-450 mt-2">
                No Reviews Yet
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-normal">
                Be the first to share your experience with this listing.
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="p-5 border border-zinc-100 rounded-2xl bg-zinc-50/20 dark:border-zinc-900 dark:bg-zinc-900/20 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {review.userImageUrl ? (
                      <Image
                        src={review.userImageUrl}
                        alt={review.userName}
                        width={28}
                        height={28}
                        className="rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">
                        {review.userName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {review.userName}
                    </span>
                    {verifiedReviewerIdSet.has(review.userId) && (
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider">
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= review.rating ? 'fill-current' : 'fill-transparent stroke-current stroke-2'
                      }`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>

                {review.comment && (
                  <p className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-sans">
                    {review.comment}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Writing Form */}
      {isLoggedIn && !isVendorOwner && canSubmitReview && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mt-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 font-mono">
            {userHasReviewed ? 'Update Your Review' : 'Write a Review'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {/* Star selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-2 font-mono">Your Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                >
                  <svg
                    className={`w-6 h-6 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-current'
                        : 'fill-transparent stroke-current stroke-2'
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Comment input */}
            <div className="space-y-1.5">
              <label htmlFor="comment" className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Feedback Comment (optional)
              </label>
              <textarea
                id="comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike? Let other buyers know."
                className="w-full text-xs rounded-xl border border-zinc-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:border-zinc-800 dark:bg-zinc-900/50 dark:focus:ring-purple-500 transition-all"
                maxLength={1000}
              />
            </div>
            {/* Messages removed - handled by Sonner toasts */}

            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-900/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? 'Submitting...' : userHasReviewed ? 'Update Review' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {isLoggedIn && !isVendorOwner && !canSubmitReview && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-4 font-mono">
          Purchase this item before submitting a review. After your order is placed, you can share feedback here.
        </p>
      )}

      {isLoggedIn && isVendorOwner && (
        <p className="text-xs text-zinc-450 dark:text-zinc-550 border-t border-zinc-100 dark:border-zinc-900 pt-4 font-mono italic">
          ℹ️ You represent the vendor offering this product/service and are ineligible to submit customer reviews.
        </p>
      )}

      {!isLoggedIn && (
        <SignInPrompt message="🔒 Please sign in to write or update a customer review." />
      )}
    </div>
  );
}
