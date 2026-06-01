'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { rateLimit } from '@/utils/rateLimit';
import { logger } from '@/utils/logger';
import {
  toggleWishlistSchema,
  submitReviewSchema,
  submitQuestionSchema,
  submitAnswerSchema,
} from '@/utils/schemas';
import { runWithCorrelationId } from '@/utils/asyncContext';

/**
 * Toggles a product in/out of the user's wishlist.
 * If already wishlisted, it deletes it. If not, it creates a wishlist entry.
 */
export async function toggleWishlistAction(productId: string) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = toggleWishlistSchema.safeParse({ productId });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      await rateLimit(10, 60 * 1000); // Max 10 wishlist toggles per minute per IP
      const { userId } = await auth();
      if (!userId) {
        throw new Error('You must be signed in to add items to your wishlist.');
      }

      // Check if the product is already in the wishlist
      const [existing] = await db
        .select()
        .from(schema.wishlists)
        .where(
          and(
            eq(schema.wishlists.userId, userId),
            eq(schema.wishlists.productId, parsed.data.productId)
          )
        )
        .limit(1);

      if (existing) {
        // Remove it
        await db
          .delete(schema.wishlists)
          .where(
            and(
              eq(schema.wishlists.userId, userId),
              eq(schema.wishlists.productId, parsed.data.productId)
            )
          );
        
        revalidatePath(`/products/${parsed.data.productId}`);
        revalidatePath('/products');
        revalidatePath('/customer');
        return { success: true, isFavorited: false };
      } else {
        // Add it
        await db.insert(schema.wishlists).values({
          userId,
          productId: parsed.data.productId,
        });

        revalidatePath(`/products/${parsed.data.productId}`);
        revalidatePath('/products');
        revalidatePath('/customer');
        return { success: true, isFavorited: true };
      }
    } catch (error) {
      logger.error('Error toggling wishlist', error);
      throw new Error(error instanceof Error ? error.message : 'Database error');
    }
  });
}

/**
 * Inserts or updates a user's product review.
 * Only one review per user per product is permitted.
 */
export async function submitReviewAction(productId: string, rating: number, comment: string) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = submitReviewSchema.safeParse({ productId, rating, comment });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      await rateLimit(5, 60 * 1000); // Max 5 reviews per minute per IP
      const { userId } = await auth();
      const user = await currentUser();

      if (!userId || !user) {
        throw new Error('You must be signed in to submit a review.');
      }

      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Anonymous';
      const userImageUrl = user.imageUrl || '';

      // Check if user already reviewed this product
      const [existing] = await db
        .select()
        .from(schema.reviews)
        .where(
          and(
            eq(schema.reviews.userId, userId),
            eq(schema.reviews.productId, parsed.data.productId)
          )
        )
        .limit(1);

      if (existing) {
        // Update their previous review
        await db
          .update(schema.reviews)
          .set({
            rating: parsed.data.rating,
            comment: parsed.data.comment,
            userName,
            userImageUrl,
            createdAt: new Date(),
          })
          .where(eq(schema.reviews.id, existing.id));
      } else {
        // Insert a new review
        await db.insert(schema.reviews).values({
          productId: parsed.data.productId,
          userId,
          userName,
          userImageUrl,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
        });
      }

      revalidatePath(`/products/${parsed.data.productId}`);
      revalidatePath('/products');
      return { success: true };
    } catch (error) {
      logger.error('Error submitting review', error, { productId });
      throw new Error(error instanceof Error ? error.message : 'Database error');
    }
  });
}

/**
 * Submits a public question on a product catalog item.
 */
export async function submitQuestionAction(productId: string, content: string) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = submitQuestionSchema.safeParse({ productId, content });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      await rateLimit(5, 60 * 1000); // Max 5 questions per minute per IP
      const { userId } = await auth();
      const user = await currentUser();

      if (!userId || !user) {
        throw new Error('You must be signed in to ask a question.');
      }

      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Anonymous';
      const userImageUrl = user.imageUrl || '';

      await db.insert(schema.questions).values({
        productId: parsed.data.productId,
        userId,
        userName,
        userImageUrl,
        content: parsed.data.content,
      });

      revalidatePath(`/products/${parsed.data.productId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error submitting question', error, { productId });
      throw new Error(error instanceof Error ? error.message : 'Database error');
    }
  });
}

/**
 * Submits a response to a public question.
 * Only the vendor who owns the product is allowed to answer.
 */
export async function submitAnswerAction(questionId: string, answer: string) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = submitAnswerSchema.safeParse({ questionId, answer });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      await rateLimit(10, 60 * 1000); // Max 10 answers per minute per IP
      const { userId, orgId, orgRole } = await auth();

      if (!userId || !orgId) {
        throw new Error('Not authorized: You must be logged in with an active organization.');
      }

      // Role check: must be admin or vendor member of the seller organization
      if (orgRole !== 'org:admin' && orgRole !== 'org:vendor') {
        throw new Error('Not authorized: Only vendors or administrators can reply to questions.');
      }

      // Resolve the question and verify the product belongs to the seller's active organization
      const [questionDetails] = await db
        .select({
          question: schema.questions,
          product: schema.products,
        })
        .from(schema.questions)
        .innerJoin(schema.products, eq(schema.questions.productId, schema.products.id))
        .where(eq(schema.questions.id, parsed.data.questionId))
        .limit(1);

      if (!questionDetails) {
        throw new Error('Question not found.');
      }

      if (questionDetails.product.orgId !== orgId) {
        throw new Error('Not authorized: This product does not belong to your organization.');
      }

      // Update with answer details
      await db
        .update(schema.questions)
        .set({
          answer: parsed.data.answer,
          answeredBy: userId,
          answeredAt: new Date(),
        })
        .where(eq(schema.questions.id, parsed.data.questionId));

      revalidatePath(`/products/${questionDetails.product.id}`);
      return { success: true };
    } catch (error) {
      logger.error('Error answering question', error, { questionId });
      throw new Error(error instanceof Error ? error.message : 'Database error');
    }
  });
}
