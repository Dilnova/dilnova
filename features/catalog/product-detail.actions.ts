"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import * as schema from "@/shared/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/shared/security/rate-limit";
import { logger } from "@/shared/logging/logger";
import {
  toggleWishlistSchema,
  submitReviewSchema,
  submitQuestionSchema,
  submitAnswerSchema,
  incrementViewsSchema,
} from "@/features/catalog/schema";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { hasCustomerPurchasedProduct } from "@/features/catalog/verified-buyer";
import { isUserMemberOfOrganization } from "@/shared/auth/org-membership.server";
import { authenticatedAction, vendorAction, ActionError } from "@/lib/safe-action";
import { db } from "@/shared/db/client";

/**
 * Toggles a product in/out of the user's wishlist.
 * If already wishlisted, it deletes it. If not, it creates a wishlist entry.
 */
export const toggleWishlistAction = authenticatedAction
  .schema(toggleWishlistSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000); // Max 10 wishlist toggles per minute per IP

      // Check if the product is already in the wishlist
      const [existing] = await ctx.db
        .select({ id: schema.wishlists.id })
        .from(schema.wishlists)
        .where(
          and(
            eq(schema.wishlists.userId, userId),
            eq(schema.wishlists.productId, parsedInput.productId),
          ),
        )
        .limit(1);

      if (existing) {
        // Remove it
        await ctx.db
          .delete(schema.wishlists)
          .where(
            and(
              eq(schema.wishlists.userId, userId),
              eq(schema.wishlists.productId, parsedInput.productId),
            ),
          );

        revalidatePath(`/products/${parsedInput.productId}`);
        revalidatePath("/customer");
        return { success: true, isFavorited: false };
      } else {
        // Add it
        await ctx.db.insert(schema.wishlists).values({
          userId,
          productId: parsedInput.productId,
        });

        revalidatePath(`/products/${parsedInput.productId}`);
        revalidatePath("/customer");
        return { success: true, isFavorited: true };
      }
    });
  });

/**
 * Inserts or updates a user's product review.
 * Only one review per user per product is permitted.
 */
export const submitReviewAction = authenticatedAction
  .schema(submitReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(5, 60 * 1000); // Max 5 reviews per minute per IP

      const user = await currentUser();
      if (!user) {
        throw new ActionError("You must be signed in to submit a review.");
      }

      const [product] = await ctx.db
        .select({ orgId: schema.products.orgId })
        .from(schema.products)
        .where(eq(schema.products.id, parsedInput.productId))
        .limit(1);

      if (!product) {
        throw new ActionError("Product not found.");
      }

      const isVendorMember = await isUserMemberOfOrganization(userId, product.orgId);
      if (isVendorMember) {
        throw new ActionError("Vendor members cannot review their own products.");
      }

      const userName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Anonymous";
      const userImageUrl = user.imageUrl || "";

      // Check if user already reviewed this product
      const [existing] = await ctx.db
        .select({ id: schema.reviews.id })
        .from(schema.reviews)
        .where(
          and(
            eq(schema.reviews.userId, userId),
            eq(schema.reviews.productId, parsedInput.productId),
          ),
        )
        .limit(1);

      if (existing) {
        // Update their previous review
        await ctx.db
          .update(schema.reviews)
          .set({
            rating: parsedInput.rating,
            comment: parsedInput.comment,
            userName,
            userImageUrl,
            createdAt: new Date(),
          })
          .where(eq(schema.reviews.id, existing.id));
      } else {
        const purchased = await hasCustomerPurchasedProduct(parsedInput.productId, userId);

        if (!purchased) {
          throw new ActionError(
            "Only verified buyers who have ordered this item can submit a review.",
          );
        }

        // Insert a new review
        await ctx.db.insert(schema.reviews).values({
          productId: parsedInput.productId,
          userId,
          userName,
          userImageUrl,
          rating: parsedInput.rating,
          comment: parsedInput.comment,
        });
      }

      revalidatePath(`/products/${parsedInput.productId}`);
      return { success: true };
    });
  });

/**
 * Submits a public question on a product catalog item.
 */
export const submitQuestionAction = authenticatedAction
  .schema(submitQuestionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(5, 60 * 1000); // Max 5 questions per minute per IP

      const user = await currentUser();
      if (!user) {
        throw new ActionError("You must be signed in to ask a question.");
      }

      const userName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Anonymous";
      const userImageUrl = user.imageUrl || "";

      await ctx.db.insert(schema.questions).values({
        productId: parsedInput.productId,
        userId,
        userName,
        userImageUrl,
        content: parsedInput.content,
      });

      revalidatePath(`/products/${parsedInput.productId}`);
      return { success: true };
    });
  });

/**
 * Submits a response to a public question.
 * Only the vendor who owns the product is allowed to answer.
 */
export const submitAnswerAction = vendorAction
  .schema(submitAnswerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, orgId } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000); // Max 10 answers per minute per IP

      if (!orgId) {
        throw new ActionError("Not authorized: You must be logged in with an active organization.");
      }

      // Resolve the question and verify the product belongs to the seller's active organization
      const [questionDetails] = await ctx.db
        .select({
          question: schema.questions,
          product: schema.products,
        })
        .from(schema.questions)
        .innerJoin(schema.products, eq(schema.questions.productId, schema.products.id))
        .where(eq(schema.questions.id, parsedInput.questionId))
        .limit(1);

      if (!questionDetails) {
        throw new ActionError("Question not found.");
      }

      if (questionDetails.product.orgId !== orgId) {
        throw new ActionError("Not authorized: This product does not belong to your organization.");
      }

      // Update with answer details
      await ctx.db
        .update(schema.questions)
        .set({
          answer: parsedInput.answer,
          answeredBy: userId,
          answeredAt: new Date(),
        })
        .where(eq(schema.questions.id, parsedInput.questionId));

      revalidatePath(`/products/${questionDetails.product.id}`);
      return { success: true };
    });
  });

/**
 * Increments a product's views count securely.
 * Rate limited to prevent spam. Kept as plain async function since it is
 * fire-and-forget and should not break the client on auth failure.
 */
export async function incrementProductViewsAction(productId: string) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = incrementViewsSchema.safeParse({ productId });
      if (!parsed.success) {
        return { success: false };
      }

      await rateLimit(3, 60 * 1000); // Max 3 page views per minute per IP

      await db
        .update(schema.products)
        .set({
          views: sql`${schema.products.views} + 1`,
        })
        .where(eq(schema.products.id, parsed.data.productId));

      return { success: true };
    } catch (error) {
      // Silently handle rate limit or other issues to prevent breaking client-side UX
      logger.warn("Failed to increment product views", { productId, error });
      return { success: false };
    }
  });
}

/**
 * Fetches the user's wishlisted product IDs for a given set of products.
 * Kept as plain async function since it returns [] gracefully when unauthenticated.
 */
export async function getUserWishlistIdsAction(productIds: string[]) {
  if (!productIds || productIds.length === 0) return [];
  const safeProductIds = productIds.slice(0, 200);
  return runWithCorrelationId(async () => {
    try {
      const { userId } = await auth();
      if (!userId) return [];
      const wishlists = await db
        .select({ productId: schema.wishlists.productId })
        .from(schema.wishlists)
        .where(
          and(
            eq(schema.wishlists.userId, userId),
            inArray(schema.wishlists.productId, safeProductIds),
          ),
        );
      return wishlists.map((w) => w.productId);
    } catch (error) {
      logger.error("Error fetching user wishlist IDs", error);
      return [];
    }
  });
}

/**
 * Fetches the user's personalized state for a specific product.
 * Kept as plain async function since it returns a safe default when unauthenticated.
 */
export async function getUserProductStateAction(productId: string) {
  return runWithCorrelationId(async () => {
    try {
      const { userId } = await auth();
      if (!userId) {
        return { userHasReviewed: false, isVerifiedBuyer: false, existingReview: null };
      }

      const [reviewRows, purchased] = await Promise.all([
        db
          .select({ rating: schema.reviews.rating, comment: schema.reviews.comment })
          .from(schema.reviews)
          .where(and(eq(schema.reviews.userId, userId), eq(schema.reviews.productId, productId)))
          .limit(1),
        hasCustomerPurchasedProduct(productId, userId),
      ]);

      return {
        userHasReviewed: reviewRows.length > 0,
        isVerifiedBuyer: purchased,
        existingReview: reviewRows[0] || null,
      };
    } catch (error) {
      logger.error("Error fetching user product state", error);
      return { userHasReviewed: false, isVerifiedBuyer: false, existingReview: null };
    }
  });
}
