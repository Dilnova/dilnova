'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath, updateTag } from 'next/cache';
import { getSystemSetting } from '@/utils/settings';

interface AddProductInput {
  name: string;
  type: 'product' | 'service';
  description: string;
  priceInDollars: number;
  imageUrl: string;
  media: { url: string; type: 'image' | 'video' }[];
  categoryId: string; // uuid
}

/**
 * Enterprise-grade Server Action to securely insert a new product/service into PostgreSQL.
 * Validates authentication, roles, and input formatting to prevent injections or cross-tenant write operations.
 */
export async function addProductAction(data: AddProductInput) {
  try {
    // 1. Authentication & Organization Context Check
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) {
      throw new Error('Not authorized: You must be signed in with an active organization.');
    }

    // 2. Authorization Check: Must be admin or vendor member of the organization
    if (orgRole !== 'org:admin' && orgRole !== 'org:vendor') {
      throw new Error('Not authorized: You do not have permissions to manage this catalog.');
    }

    // 3. Sanitization & Validation
    const name = data.name?.trim().slice(0, 100);
    const description = data.description?.trim().slice(0, 1000) || '';
    const imageUrl = data.imageUrl?.trim() || '';
    const categoryId = data.categoryId?.trim() || null;
    const type = data.type === 'service' ? 'service' : 'product';

    if (!name) {
      throw new Error('Validation failed: Product name is required.');
    }

    if (isNaN(data.priceInDollars) || data.priceInDollars <= 0) {
      throw new Error('Validation failed: Price must be a positive number.');
    }

    // Convert price to cents to avoid floating-point arithmetic errors
    const priceInCents = Math.round(data.priceInDollars * 100);

    // Load max media uploads config and validate
    const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
    const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;

    const mediaPayload = Array.isArray(data.media) ? data.media.slice(0, maxMediaLimit) : [];

    // 4. Secure Insert
    await db.insert(schema.products).values({
      name,
      type,
      description,
      price: priceInCents,
      imageUrl: imageUrl || null,
      media: mediaPayload,
      orgId: orgId, // Tied securely to user's current session orgId
      categoryId: categoryId || null,
    });

    // 5. Cache Invalidation
    revalidatePath('/products');
    revalidatePath('/vendors');
    revalidatePath('/vendor/products');
    updateTag(`vendor-products-${orgId}`);

    return { success: true };
  } catch (error) {
    console.error('Error adding product:', error);
    throw new Error(error instanceof Error ? error.message : 'Internal database error');
  }
}

/**
 * Secures and handles deletion of a product/service.
 * Ensures the product actually belongs to the user's active organization (prevents cross-tenant deletion).
 */
export async function deleteProductAction(productId: string) {
  try {
    // 1. Authentication & Organization Context Check
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) {
      throw new Error('Not authorized: You must be signed in with an active organization.');
    }

    // 2. Authorization Check
    if (orgRole !== 'org:admin' && orgRole !== 'org:vendor') {
      throw new Error('Not authorized: You do not have permissions to modify this catalog.');
    }

    // 3. Safe Deletion: Conditioned on both Product ID AND Organization ID
    const result = await db
      .delete(schema.products)
      .where(
        and(
          eq(schema.products.id, productId),
          eq(schema.products.orgId, orgId) // Prevent deleting items from other vendors
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error('Item not found or does not belong to your organization.');
    }

    // 4. Cache Invalidation
    revalidatePath('/products');
    revalidatePath('/vendors');
    revalidatePath('/vendor/products');
    updateTag(`vendor-products-${orgId}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    throw new Error(error instanceof Error ? error.message : 'Internal database error');
  }
}
