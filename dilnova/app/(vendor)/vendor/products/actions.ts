'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath, updateTag } from 'next/cache';
import { getSystemSetting } from '@/utils/settings';
import { logger } from '@/utils/logger';
import { addProductSchema, vendorDeleteProductSchema } from '@/utils/schemas';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';

/**
 * Enterprise-grade Server Action to securely insert a new product/service into PostgreSQL.
 * Validates authentication, roles, and input formatting to prevent injections or cross-tenant write operations.
 */
export async function addProductAction(data: {
  name: string;
  type: 'product' | 'service';
  description: string;
  priceInDollars: number;
  imageUrl: string;
  media: { url: string; type: 'image' | 'video' }[];
  categoryId: string;
  quantity?: number;
}) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = addProductSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      // 1. Authentication & Organization Context Check
      const { userId, orgId, orgRole } = await auth();
      if (!userId || !orgId) {
        throw new Error('Not authorized: You must be signed in with an active organization.');
      }

      // 2. Authorization Check: Must be admin or vendor member of the organization
      if (orgRole !== 'org:admin' && orgRole !== 'org:member') {
        throw new Error('Not authorized: You do not have permissions to manage this catalog.');
      }

      // Convert price to cents to avoid floating-point arithmetic errors
      const priceInCents = Math.round(parsed.data.priceInDollars * 100);

      // Load max media uploads config and validate
      const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
      const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;

      const mediaPayload = parsed.data.media.slice(0, maxMediaLimit);

      // 3. Secure Insert
      const [newProduct] = await db
        .insert(schema.products)
        .values({
          name: parsed.data.name,
          type: parsed.data.type,
          description: parsed.data.description,
          price: priceInCents,
          imageUrl: parsed.data.imageUrl || null,
          media: mediaPayload,
          orgId: orgId, // Tied securely to user's current session orgId
          categoryId: parsed.data.categoryId || null,
        })
        .returning();

      if (newProduct) {
        // Initialize inventory entry if product type is 'product'
        if (newProduct.type === 'product') {
          const initialQty = parsed.data.quantity ?? 0;
          const [inv] = await db
            .insert(schema.inventory)
            .values({
              productId: newProduct.id,
              sku: null,
              quantity: initialQty,
              lowStockThreshold: 5,
              binLocation: null,
              supplierId: null,
            })
            .returning();

          if (inv && initialQty > 0) {
            await db.insert(schema.inventoryMovements).values({
              inventoryId: inv.id,
              type: 'restock',
              quantityChanged: initialQty,
              previousQuantity: 0,
              newQuantity: initialQty,
              reason: 'Initial setup on item creation',
              userId,
            });
          }
        }

        await logAuditAction({
          userId,
          action: 'CREATE_PRODUCT',
          targetType: 'product',
          targetId: newProduct.id,
          metadata: {
            name: newProduct.name,
            type: newProduct.type,
            price: newProduct.price,
            orgId: newProduct.orgId,
          },
        });
      }

      // 4. Cache Invalidation
      revalidatePath('/products');
      revalidatePath('/vendors');
      revalidatePath('/vendor/products');
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error adding product', error);
      throw new Error(error instanceof Error ? error.message : 'Internal database error');
    }
  });
}

/**
 * Secures and handles deletion of a product/service.
 * Ensures the product actually belongs to the user's active organization (prevents cross-tenant deletion).
 */
export async function deleteProductAction(productId: string) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = vendorDeleteProductSchema.safeParse({ productId });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      // 1. Authentication & Organization Context Check
      const { userId, orgId, orgRole } = await auth();
      if (!userId || !orgId) {
        throw new Error('Not authorized: You must be signed in with an active organization.');
      }

      // 2. Authorization Check
      if (orgRole !== 'org:admin' && orgRole !== 'org:member') {
        throw new Error('Not authorized: You do not have permissions to modify this catalog.');
      }

      // 3. Safe Deletion: Conditioned on both Product ID AND Organization ID
      const result = await db
        .delete(schema.products)
        .where(
          and(
            eq(schema.products.id, parsed.data.productId),
            eq(schema.products.orgId, orgId) // Prevent deleting items from other vendors
          )
        )
        .returning();

      if (result.length === 0) {
        throw new Error('Item not found or does not belong to your organization.');
      }

      const deletedProduct = result[0];
      if (deletedProduct) {
        await logAuditAction({
          userId,
          action: 'DELETE_PRODUCT',
          targetType: 'product',
          targetId: deletedProduct.id,
          metadata: {
            name: deletedProduct.name,
            orgId: deletedProduct.orgId,
          },
        });
      }

      // 4. Cache Invalidation
      revalidatePath('/products');
      revalidatePath('/vendors');
      revalidatePath('/vendor/products');
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting product', error);
      throw new Error(error instanceof Error ? error.message : 'Internal database error');
    }
  });
}
