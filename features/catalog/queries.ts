import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getUserAssignedBranchNames(userId: string, orgId: string) {
  const userBranches = await db
    .select({ name: schema.branches.name })
    .from(schema.branchMembers)
    .innerJoin(schema.branches, eq(schema.branchMembers.branchId, schema.branches.id))
    .where(
      and(
        eq(schema.branchMembers.memberUserId, userId),
        eq(schema.branches.orgId, orgId)
      )
    );

  return userBranches.map((b) => b.name).join(', ');
}

export async function getDefaultBranchName(orgId: string) {
  const [defaultBranch] = await db
    .select({ name: schema.branches.name })
    .from(schema.branches)
    .where(
      and(
        eq(schema.branches.orgId, orgId),
        eq(schema.branches.isDefault, true)
      )
    )
    .limit(1);

  if (defaultBranch) {
    return defaultBranch.name;
  }

  const [firstBranch] = await db
    .select({ name: schema.branches.name })
    .from(schema.branches)
    .where(eq(schema.branches.orgId, orgId))
    .limit(1);

  return firstBranch ? firstBranch.name : 'Main Register';
}

export async function getAllCategories() {
  return db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      parentId: schema.categories.parentId,
    })
    .from(schema.categories);
}

export async function getBranchesForOrg(orgId: string) {
  return db
    .select({
      id: schema.branches.id,
      name: schema.branches.name,
      isDefault: schema.branches.isDefault,
    })
    .from(schema.branches)
    .where(eq(schema.branches.orgId, orgId));
}

export async function getAssignedBranchIdsForUser(userId: string) {
  const assignedRows = await db
    .select({ branchId: schema.branchMembers.branchId })
    .from(schema.branchMembers)
    .where(eq(schema.branchMembers.memberUserId, userId));

  return new Set(assignedRows.map((row) => row.branchId));
}

export async function getProductForMetadata(id: string) {
  const [result] = await db
    .select({
      product: schema.products,
    })
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .limit(1);

  return result ?? null;
}

export async function getProductWithCategory(id: string) {
  const [result] = await db
    .select({
      product: schema.products,
      category: schema.categories,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.products.id, id))
    .limit(1);

  return result ?? null;
}

export async function getInventoryForProduct(productId: string) {
  const rows = await db
    .select({
      stockAvailability: schema.inventory.stockAvailability,
      quantity: schema.inventory.quantity,
    })
    .from(schema.inventory)
    .where(eq(schema.inventory.productId, productId))
    .limit(1);

  return rows[0] || null;
}

export async function getProductReviews(productId: string) {
  return db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.productId, productId))
    .orderBy(desc(schema.reviews.createdAt));
}

export async function getProductQuestions(productId: string) {
  return db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.productId, productId))
    .orderBy(desc(schema.questions.createdAt));
}

export async function getWishlistEntryForUser(userId: string, productId: string) {
  const rows = await db
    .select()
    .from(schema.wishlists)
    .where(
      and(
        eq(schema.wishlists.userId, userId),
        eq(schema.wishlists.productId, productId)
      )
    )
    .limit(1);

  return rows[0];
}

export async function getUserReviewForProduct(userId: string, productId: string) {
  const rows = await db
    .select()
    .from(schema.reviews)
    .where(
      and(
        eq(schema.reviews.userId, userId),
        eq(schema.reviews.productId, productId)
      )
    )
    .limit(1);

  return rows[0];
}

export async function getCategoryById(id: string) {
  const [parentResult] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.id, id))
    .limit(1);

  return parentResult || null;
}

export async function getVendorProductsForOrg(orgId: string) {
  return db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      type: schema.products.type,
      description: schema.products.description,
      price: schema.products.price,
      imageUrl: schema.products.imageUrl,
      media: schema.products.media,
      categoryId: schema.products.categoryId,
      stockQuantity: schema.inventory.quantity,
    })
    .from(schema.products)
    .leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.productId))
    .where(eq(schema.products.orgId, orgId));
}
