'use server';

import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function checkSuperAdmin() {
  const user = await currentUser();
  const userRole = user?.publicMetadata?.role as string | undefined;
  if (userRole !== 'admin') {
    throw new Error('Unauthorized: Only global administrators can perform this action.');
  }
}

// ── CATEGORIES CRUD ───────────────────────────────────────────

export async function createCategoryAction(name: string, slug: string, parentId?: string | null) {
  await checkSuperAdmin();

  if (!name.trim() || !slug.trim()) {
    throw new Error('Name and slug cannot be empty.');
  }

  await db.insert(schema.categories).values({
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    parentId: parentId || null,
  });

  revalidatePath('/superadmin');
  revalidatePath('/products');
}

export async function updateCategoryAction(id: string, name: string, slug: string, parentId?: string | null) {
  await checkSuperAdmin();

  if (!name.trim() || !slug.trim()) {
    throw new Error('Name and slug cannot be empty.');
  }

  if (parentId === id) {
    throw new Error('A category cannot refer to itself as its parent.');
  }

  await db
    .update(schema.categories)
    .set({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      parentId: parentId || null,
    })
    .where(eq(schema.categories.id, id));

  revalidatePath('/superadmin');
  revalidatePath('/products');
}

export async function deleteCategoryAction(id: string) {
  await checkSuperAdmin();

  // Check if any products are currently associated with this category
  const associatedProducts = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.categoryId, id))
    .limit(1);

  if (associatedProducts.length > 0) {
    throw new Error('Cannot delete category: It is currently linked to active products or services.');
  }

  await db.delete(schema.categories).where(eq(schema.categories.id, id));

  revalidatePath('/superadmin');
  revalidatePath('/products');
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
  await checkSuperAdmin();

  const setClause: Partial<typeof schema.products.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) {
    if (!updates.name.trim()) throw new Error('Product name cannot be empty.');
    setClause.name = updates.name.trim();
  }

  if (updates.price !== undefined) {
    if (updates.price < 0) throw new Error('Price cannot be negative.');
    setClause.price = updates.price;
  }

  if (updates.categoryId !== undefined) {
    setClause.categoryId = updates.categoryId;
  }

  if (updates.description !== undefined) {
    setClause.description = updates.description;
  }

  if (updates.type !== undefined) {
    setClause.type = updates.type;
  }

  await db
    .update(schema.products)
    .set(setClause)
    .where(eq(schema.products.id, id));

  revalidatePath('/superadmin');
  revalidatePath('/products');
  revalidatePath(`/products/${id}`);
}

export async function deleteProductAction(id: string) {
  await checkSuperAdmin();

  await db.delete(schema.products).where(eq(schema.products.id, id));

  revalidatePath('/superadmin');
  revalidatePath('/products');
}
