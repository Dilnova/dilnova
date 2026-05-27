'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Toggles a product in/out of the user's wishlist.
 * If already wishlisted, it deletes it. If not, it creates a wishlist entry.
 */
export async function toggleWishlistAction(productId: string) {
  try {
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
          eq(schema.wishlists.productId, productId)
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
            eq(schema.wishlists.productId, productId)
          )
        );
      
      revalidatePath(`/products/${productId}`);
      revalidatePath('/products');
      revalidatePath('/customer');
      return { success: true, isFavorited: false };
    } else {
      // Add it
      await db.insert(schema.wishlists).values({
        userId,
        productId,
      });

      revalidatePath(`/products/${productId}`);
      revalidatePath('/products');
      revalidatePath('/customer');
      return { success: true, isFavorited: true };
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    throw new Error(error instanceof Error ? error.message : 'Database error');
  }
}

/**
 * Inserts or updates a user's product review.
 * Only one review per user per product is permitted.
 */
export async function submitReviewAction(productId: string, rating: number, comment: string) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      throw new Error('You must be signed in to submit a review.');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5.');
    }

    const trimmedComment = comment?.trim().slice(0, 1000) || '';
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Anonymous';
    const userImageUrl = user.imageUrl || '';

    // Check if user already reviewed this product
    const [existing] = await db
      .select()
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.userId, userId),
          eq(schema.reviews.productId, productId)
        )
      )
      .limit(1);

    if (existing) {
      // Update their previous review
      await db
        .update(schema.reviews)
        .set({
          rating,
          comment: trimmedComment,
          userName,
          userImageUrl,
          createdAt: new Date(),
        })
        .where(eq(schema.reviews.id, existing.id));
    } else {
      // Insert a new review
      await db.insert(schema.reviews).values({
        productId,
        userId,
        userName,
        userImageUrl,
        rating,
        comment: trimmedComment,
      });
    }

    revalidatePath(`/products/${productId}`);
    revalidatePath('/products');
    return { success: true };
  } catch (error) {
    console.error('Error submitting review:', error);
    throw new Error(error instanceof Error ? error.message : 'Database error');
  }
}

/**
 * Submits a public question on a product catalog item.
 */
export async function submitQuestionAction(productId: string, content: string) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      throw new Error('You must be signed in to ask a question.');
    }

    const trimmedContent = content?.trim().slice(0, 500);
    if (!trimmedContent) {
      throw new Error('Question content cannot be empty.');
    }

    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Anonymous';
    const userImageUrl = user.imageUrl || '';

    await db.insert(schema.questions).values({
      productId,
      userId,
      userName,
      userImageUrl,
      content: trimmedContent,
    });

    revalidatePath(`/products/${productId}`);
    return { success: true };
  } catch (error) {
    console.error('Error submitting question:', error);
    throw new Error(error instanceof Error ? error.message : 'Database error');
  }
}

/**
 * Submits a response to a public question.
 * Only the vendor who owns the product is allowed to answer.
 */
export async function submitAnswerAction(questionId: string, answer: string) {
  try {
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
      throw new Error('Not authorized: You must be logged in with an active organization.');
    }

    // Role check: must be admin or vendor member of the seller organization
    if (orgRole !== 'org:admin' && orgRole !== 'org:vendor') {
      throw new Error('Not authorized: Only vendors or administrators can reply to questions.');
    }

    const trimmedAnswer = answer?.trim().slice(0, 1000);
    if (!trimmedAnswer) {
      throw new Error('Answer cannot be empty.');
    }

    // Resolve the question and verify the product belongs to the seller's active organization
    const [questionDetails] = await db
      .select({
        question: schema.questions,
        product: schema.products,
      })
      .from(schema.questions)
      .innerJoin(schema.products, eq(schema.questions.productId, schema.products.id))
      .where(eq(schema.questions.id, questionId))
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
        answer: trimmedAnswer,
        answeredBy: userId,
        answeredAt: new Date(),
      })
      .where(eq(schema.questions.id, questionId));

    revalidatePath(`/products/${questionDetails.product.id}`);
    return { success: true };
  } catch (error) {
    console.error('Error answering question:', error);
    throw new Error(error instanceof Error ? error.message : 'Database error');
  }
}
