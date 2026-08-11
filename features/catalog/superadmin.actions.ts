"use server";

import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  createTaxClassSchema,
  updateTaxClassSchema,
  deleteTaxClassSchema,
  updateProductSchema,
  deleteProductSchema,
} from "@/features/catalog/schema";
import { superadminAction, ActionError } from "@/lib/safe-action";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { isAllowedCloudinaryDeliveryUrl } from "@/shared/media/cloudinary-url";
import { deleteCloudinaryAsset } from "@/shared/media/cloudinary-server";

export const createCategoryAction = superadminAction
  .schema(createCategorySchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true }); // Max 20 superadmin operations per minute per user

      const [category] = await db
        .insert(schema.categories)
        .values({
          name: parsedInput.name,
          slug: parsedInput.slug.toLowerCase(),
          parentId: parsedInput.parentId || null,
          taxClassId: parsedInput.taxClassId || null,
        })
        .returning();

      if (category) {
        await logAuditAction({
          userId: ctx.userId,
          action: "CREATE_CATEGORY",
          targetType: "category",
          targetId: category.id,
          metadata: {
            name: category.name,
            slug: category.slug,
            parentId: category.parentId,
            taxClassId: category.taxClassId,
          },
        });
      }

      revalidatePath("/superadmin");
      revalidatePath("/products");
      return { success: true };
    });
  });

export const updateCategoryAction = superadminAction
  .schema(updateCategorySchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true }); // Max 20 superadmin operations per minute per user

      if (parsedInput.parentId === parsedInput.id) {
        throw new ActionError("A category cannot refer to itself as its parent.");
      }

      await db
        .update(schema.categories)
        .set({
          name: parsedInput.name,
          slug: parsedInput.slug.toLowerCase(),
          parentId: parsedInput.parentId || null,
          taxClassId: parsedInput.taxClassId || null,
        })
        .where(eq(schema.categories.id, parsedInput.id));

      await logAuditAction({
        userId: ctx.userId,
        action: "UPDATE_CATEGORY",
        targetType: "category",
        targetId: parsedInput.id,
        metadata: {
          name: parsedInput.name,
          slug: parsedInput.slug,
          parentId: parsedInput.parentId,
        },
      });

      revalidatePath("/superadmin");
      revalidatePath("/products");
      return { success: true };
    });
  });

export const deleteCategoryAction = superadminAction
  .schema(deleteCategorySchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true }); // Max 20 superadmin operations per minute per user

      // Check if any products are currently associated with this category
      const associatedProducts = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.categoryId, parsedInput.id))
        .limit(1);

      if (associatedProducts.length > 0) {
        throw new ActionError(
          "Cannot delete category: It is currently linked to active products or services.",
        );
      }

      await db.delete(schema.categories).where(eq(schema.categories.id, parsedInput.id));

      await logAuditAction({
        userId: ctx.userId,
        action: "DELETE_CATEGORY",
        targetType: "category",
        targetId: parsedInput.id,
      });

      revalidatePath("/superadmin");
      revalidatePath("/products");
      return { success: true };
    });
  });

// ── PRODUCTS & SERVICES MODERATION ────────────────────────────

export const updateProductAction = superadminAction
  .schema(updateProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true }); // Max 20 superadmin operations per minute per user

      // Fetch existing product to resolve its orgId for folder validation
      const existing = await db
        .select({ orgId: schema.products.orgId })
        .from(schema.products)
        .where(eq(schema.products.id, parsedInput.id))
        .limit(1);
      const productOrgId = existing[0]?.orgId;
      if (!productOrgId) {
        throw new ActionError("Product not found.");
      }

      if (parsedInput.updates.imageUrl) {
        if (!isAllowedCloudinaryDeliveryUrl(parsedInput.updates.imageUrl, productOrgId)) {
          throw new ActionError(
            "Invalid product image: The image must belong to the product organization folder.",
          );
        }
      }
      if (parsedInput.updates.media) {
        for (const item of parsedInput.updates.media) {
          if (!isAllowedCloudinaryDeliveryUrl(item.url, productOrgId)) {
            throw new ActionError(
              "Invalid product media: The media must belong to the product organization folder.",
            );
          }
        }
      }

      const setClause: Partial<typeof schema.products.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (parsedInput.updates.name !== undefined) {
        setClause.name = parsedInput.updates.name;
      }

      if (parsedInput.updates.price !== undefined) {
        setClause.price = parsedInput.updates.price;
      }

      if (parsedInput.updates.categoryId !== undefined) {
        setClause.categoryId = parsedInput.updates.categoryId;
      }

      if (parsedInput.updates.taxClassId !== undefined) {
        setClause.taxClassId = parsedInput.updates.taxClassId;
      }

      if (parsedInput.updates.description !== undefined) {
        setClause.description = parsedInput.updates.description;
      }

      if (parsedInput.updates.type !== undefined) {
        setClause.type = parsedInput.updates.type;
      }

      if (parsedInput.updates.imageUrl !== undefined) {
        setClause.imageUrl = parsedInput.updates.imageUrl;
      }

      if (parsedInput.updates.media !== undefined) {
        setClause.media = parsedInput.updates.media;
      }

      await db.update(schema.products).set(setClause).where(eq(schema.products.id, parsedInput.id));

      await logAuditAction({
        userId: ctx.userId,
        action: "UPDATE_PRODUCT",
        targetType: "product",
        targetId: parsedInput.id,
        metadata: { updates: parsedInput.updates },
      });

      revalidatePath("/superadmin");
      revalidatePath("/products");
      revalidatePath(`/products/${parsedInput.id}`);
      return { success: true };
    });
  });

export const deleteProductAction = superadminAction
  .schema(deleteProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true }); // Max 20 superadmin operations per minute per user

      const [deleted] = await db
        .delete(schema.products)
        .where(eq(schema.products.id, parsedInput.id))
        .returning();

      if (deleted?.imageUrl) {
        await deleteCloudinaryAsset(deleted.imageUrl);
      }
      if (deleted?.media && Array.isArray(deleted.media)) {
        for (const m of deleted.media) {
          await deleteCloudinaryAsset(m.url, m.type);
        }
      }

      await logAuditAction({
        userId: ctx.userId,
        action: "DELETE_PRODUCT",
        targetType: "product",
        targetId: parsedInput.id,
      });

      revalidatePath("/superadmin");
      revalidatePath("/products");
      return { success: true };
    });
  });

export const createTaxClassAction = superadminAction
  .schema(createTaxClassSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true });

      const [existing] = await db
        .select()
        .from(schema.taxClasses)
        .where(eq(schema.taxClasses.code, parsedInput.code))
        .limit(1);

      if (existing) {
        throw new ActionError(`A tax class with code '${parsedInput.code}' already exists.`);
      }

      const [created] = await db
        .insert(schema.taxClasses)
        .values({
          name: parsedInput.name,
          code: parsedInput.code,
          ratePercent: parsedInput.ratePercent,
        })
        .returning();

      if (created) {
        await logAuditAction({
          userId: ctx.userId,
          action: "CREATE_TAX_CLASS",
          targetType: "tax_class",
          targetId: created.id,
          metadata: { name: created.name, code: created.code, ratePercent: created.ratePercent },
        });
      }

      revalidatePath("/superadmin");
      revalidatePath("/admin");
      revalidatePath("/products");
      revalidatePath("/cart");
      return { success: true };
    });
  });

export const deleteTaxClassAction = superadminAction
  .schema(deleteTaxClassSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true });

      await db.delete(schema.taxClasses).where(eq(schema.taxClasses.id, parsedInput.id));

      await logAuditAction({
        userId: ctx.userId,
        action: "DELETE_TAX_CLASS",
        targetType: "tax_class",
        targetId: parsedInput.id,
      });

      revalidatePath("/superadmin");
      revalidatePath("/admin");
      revalidatePath("/products");
      revalidatePath("/cart");
      return { success: true };
    });
  });

export const updateTaxClassAction = superadminAction
  .schema(updateTaxClassSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true });

      const [updated] = await db
        .update(schema.taxClasses)
        .set({
          name: parsedInput.name,
          code: parsedInput.code,
          ratePercent: parsedInput.ratePercent,
        })
        .where(eq(schema.taxClasses.id, parsedInput.id))
        .returning();

      if (updated) {
        await logAuditAction({
          userId: ctx.userId,
          action: "UPDATE_TAX_CLASS",
          targetType: "tax_class",
          targetId: updated.id,
          metadata: { name: updated.name, code: updated.code, ratePercent: updated.ratePercent },
        });
      }

      revalidatePath("/superadmin");
      revalidatePath("/admin");
      revalidatePath("/products");
      revalidatePath("/cart");
      return { success: true };
    });
  });
