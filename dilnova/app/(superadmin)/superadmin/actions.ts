'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';
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
import { rateLimit } from '@/utils/rateLimit';

// ── CATEGORIES CRUD ───────────────────────────────────────────

export async function createCategoryAction(name: string, slug: string, parentId?: string | null) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000); // Max 20 superadmin operations per minute per IP
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
    await rateLimit(20, 60 * 1000); // Max 20 superadmin operations per minute per IP
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
    await rateLimit(20, 60 * 1000); // Max 20 superadmin operations per minute per IP
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
    imageUrl?: string;
    media?: { url: string; type: 'image' | 'video' }[];
  }
) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000); // Max 20 superadmin operations per minute per IP
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

    if (parsed.data.updates.imageUrl !== undefined) {
      setClause.imageUrl = parsed.data.updates.imageUrl;
    }

    if (parsed.data.updates.media !== undefined) {
      setClause.media = parsed.data.updates.media;
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
    await rateLimit(20, 60 * 1000); // Max 20 superadmin operations per minute per IP
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

// ── PRICING PLANS CRUD ─────────────────────────────────────────

export async function createPricingPlanAction(planData: {
  name: string;
  price: string;
  period: string;
  description?: string;
  features: string[];
  isPopular: boolean;
  buttonText: string;
  buttonLink: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    if (!planData.name || !planData.price) {
      throw new Error('Name and Price are required.');
    }

    const [plan] = await db
      .insert(schema.pricingPlans)
      .values({
        name: planData.name,
        price: planData.price,
        period: planData.period,
        description: planData.description || null,
        features: planData.features,
        isPopular: planData.isPopular,
        buttonText: planData.buttonText,
        buttonLink: planData.buttonLink,
      })
      .returning();

    if (plan) {
      await logAuditAction({
        userId: user.id,
        action: 'CREATE_PRICING_PLAN',
        targetType: 'pricing_plan',
        targetId: plan.id,
        metadata: { name: plan.name },
      });
    }

    revalidatePath('/');
    revalidatePath('/superadmin');
    return { success: true };
  });
}

export async function updatePricingPlanAction(
  id: string,
  updates: {
    name?: string;
    price?: string;
    period?: string;
    description?: string | null;
    features?: string[];
    isPopular?: boolean;
    buttonText?: string;
    buttonLink?: string;
  }
) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const setClause: Partial<typeof schema.pricingPlans.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) setClause.name = updates.name;
    if (updates.price !== undefined) setClause.price = updates.price;
    if (updates.period !== undefined) setClause.period = updates.period;
    if (updates.description !== undefined) setClause.description = updates.description;
    if (updates.features !== undefined) setClause.features = updates.features;
    if (updates.isPopular !== undefined) setClause.isPopular = updates.isPopular;
    if (updates.buttonText !== undefined) setClause.buttonText = updates.buttonText;
    if (updates.buttonLink !== undefined) setClause.buttonLink = updates.buttonLink;

    await db
      .update(schema.pricingPlans)
      .set(setClause)
      .where(eq(schema.pricingPlans.id, id));

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_PRICING_PLAN',
      targetType: 'pricing_plan',
      targetId: id,
      metadata: { updates },
    });

    revalidatePath('/');
    revalidatePath('/superadmin');
    return { success: true };
  });
}

export async function deletePricingPlanAction(id: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    await db.delete(schema.pricingPlans).where(eq(schema.pricingPlans.id, id));

    await logAuditAction({
      userId: user.id,
      action: 'DELETE_PRICING_PLAN',
      targetType: 'pricing_plan',
      targetId: id,
    });

    revalidatePath('/');
    revalidatePath('/superadmin');
    return { success: true };
  });
}

// ── CONTACT SUBMISSIONS & CLERK ROLE SYNC ─────────────────────

export async function updateContactStatusAction(
  id: string,
  status: 'pending' | 'connected' | 'no_longer'
) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const adminUser = await checkSuperAdmin();

    // 1. Fetch the contact submission
    const [submission] = await db
      .select()
      .from(schema.contactSubmissions)
      .where(eq(schema.contactSubmissions.id, id))
      .limit(1);

    if (!submission) {
      throw new Error('Contact request not found.');
    }

    // 2. Update status in DB
    await db
      .update(schema.contactSubmissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.contactSubmissions.id, id));

    // 3. Search and Sync Clerk user role
    try {
      const client = await clerkClient();
      const userList = await client.users.getUserList({
        emailAddress: [submission.email],
        limit: 1,
      });

      const clerkUser = userList.data?.[0];
      if (clerkUser) {
        const existingRole = clerkUser.publicMetadata?.role as string | undefined;
        if (existingRole === 'admin') {
          console.log(`Skipped role sync for superadmin user ${clerkUser.id}.`);
        } else if (status !== 'pending') {
          const nextRole = status === 'connected' ? 'vendor' : 'customer';
          await client.users.updateUserMetadata(clerkUser.id, {
            publicMetadata: {
              role: nextRole,
            },
          });
          revalidateTag('clerk-user-role', 'max');
          console.log(`Successfully updated Clerk user ${clerkUser.id} role to ${nextRole}`);
        }
      } else {
        console.log(`No Clerk user found with email ${submission.email} to sync role.`);
      }
    } catch (clerkErr) {
      console.error('Failed to update user role in Clerk:', clerkErr);
      // We don't fail the whole request, but log it so the superadmin knows.
    }

    await logAuditAction({
      userId: adminUser.id,
      action: 'UPDATE_CONTACT_STATUS',
      targetType: 'contact',
      targetId: id,
      metadata: { status, email: submission.email },
    });

    revalidatePath('/superadmin');
    return { success: true };
  });
}
