'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  updateProductSchema,
  deleteProductSchema,
} from '@/utils/schemas';
import { checkSuperAdmin } from '@/utils/authGuards';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';

// ── CATEGORIES CRUD ───────────────────────────────────────────

export async function createCategoryAction(name: string, slug: string, parentId?: string | null) {
  return runWithCorrelationId(async () => {
    const user = await checkSuperAdmin();

    // ── Schema Validation ──
    const parsed = createCategorySchema.safeParse({ name, slug, parentId });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const [category] = await db
      .insert(schema.categories)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug.toLowerCase(),
        parentId: parsed.data.parentId || null,
      })
      .returning();

    if (category) {
      await logAuditAction({
        userId: user.id,
        action: 'CREATE_CATEGORY',
        targetType: 'category',
        targetId: category.id,
        metadata: { name: category.name, slug: category.slug, parentId: category.parentId },
      });
    }

    revalidatePath('/superadmin');
    revalidatePath('/products');
  });
}

export async function updateCategoryAction(id: string, name: string, slug: string, parentId?: string | null) {
  return runWithCorrelationId(async () => {
    const user = await checkSuperAdmin();

    // ── Schema Validation ──
    const parsed = updateCategorySchema.safeParse({ id, name, slug, parentId });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    if (parsed.data.parentId === parsed.data.id) {
      throw new Error('A category cannot refer to itself as its parent.');
    }

    await db
      .update(schema.categories)
      .set({
        name: parsed.data.name,
        slug: parsed.data.slug.toLowerCase(),
        parentId: parsed.data.parentId || null,
      })
      .where(eq(schema.categories.id, parsed.data.id));

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_CATEGORY',
      targetType: 'category',
      targetId: parsed.data.id,
      metadata: { name: parsed.data.name, slug: parsed.data.slug, parentId: parsed.data.parentId },
    });

    revalidatePath('/superadmin');
    revalidatePath('/products');
  });
}

export async function deleteCategoryAction(id: string) {
  return runWithCorrelationId(async () => {
    const user = await checkSuperAdmin();

    // ── Schema Validation ──
    const parsed = deleteCategorySchema.safeParse({ id });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Check if any products are currently associated with this category
    const associatedProducts = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.categoryId, parsed.data.id))
      .limit(1);

    if (associatedProducts.length > 0) {
      throw new Error('Cannot delete category: It is currently linked to active products or services.');
    }

    await db.delete(schema.categories).where(eq(schema.categories.id, parsed.data.id));

    await logAuditAction({
      userId: user.id,
      action: 'DELETE_CATEGORY',
      targetType: 'category',
      targetId: parsed.data.id,
    });

    revalidatePath('/superadmin');
    revalidatePath('/products');
  });
}

// ── PRODUCTS & SERVICES MODERATION ────────────────────────────

export async function updateProductAction(
  id: string,
  updates: {
    name?: string;
    price?: number;
    categoryId?: string | null;
    description?: string | null;
    type?: 'product' | 'service';
  }
) {
  return runWithCorrelationId(async () => {
    const user = await checkSuperAdmin();

    // ── Schema Validation ──
    const parsed = updateProductSchema.safeParse({ id, updates });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const setClause: Partial<typeof schema.products.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.updates.name !== undefined) {
      setClause.name = parsed.data.updates.name;
    }

    if (parsed.data.updates.price !== undefined) {
      setClause.price = parsed.data.updates.price;
    }

    if (parsed.data.updates.categoryId !== undefined) {
      setClause.categoryId = parsed.data.updates.categoryId;
    }

    if (parsed.data.updates.description !== undefined) {
      setClause.description = parsed.data.updates.description;
    }

    if (parsed.data.updates.type !== undefined) {
      setClause.type = parsed.data.updates.type;
    }

    await db
      .update(schema.products)
      .set(setClause)
      .where(eq(schema.products.id, parsed.data.id));

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_PRODUCT',
      targetType: 'product',
      targetId: parsed.data.id,
      metadata: { updates: parsed.data.updates },
    });

    revalidatePath('/superadmin');
    revalidatePath('/products');
    revalidatePath(`/products/${parsed.data.id}`);
  });
}

export async function deleteProductAction(id: string) {
  return runWithCorrelationId(async () => {
    const user = await checkSuperAdmin();

    // ── Schema Validation ──
    const parsed = deleteProductSchema.safeParse({ id });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    await db.delete(schema.products).where(eq(schema.products.id, parsed.data.id));

    await logAuditAction({
      userId: user.id,
      action: 'DELETE_PRODUCT',
      targetType: 'product',
      targetId: parsed.data.id,
    });

    revalidatePath('/superadmin');
    revalidatePath('/products');
  });
}
