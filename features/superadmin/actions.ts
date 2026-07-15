'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';
import { invalidateClerkUserCache } from '@/shared/auth/clerk-cache';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import { createPricingPlanSchema, updatePricingPlanSchema } from './schema';
import { uuidField } from '@/shared/validation/primitives';
import { logger } from '@/shared/logging/logger';
import { hashPii } from '@/shared/security/encryption';

// ── PRICING PLANS CRUD ─────────────────────────────────────────

export async function createPricingPlanAction(planData: unknown) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = createPricingPlanSchema.safeParse(planData);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const {
      name,
      price,
      period,
      description,
      features,
      isPopular,
      buttonText,
      buttonLink,
    } = parsed.data;

    const [plan] = await db
      .insert(schema.pricingPlans)
      .values({
        name,
        price,
        period,
        description: description || null,
        features,
        isPopular,
        buttonText,
        buttonLink,
      })
      .returning();

    if (plan) {
      await logAuditAction({
        userId: user.id,
        action: 'CREATE_PRICING_PLAN',
        targetType: 'pricing_plan',
        targetId: plan.id,
        metadata: { name: plan.name },
        strict: true,
      });
    }

    revalidatePath('/');
    revalidatePath('/superadmin');
    return { success: true };
  });
}

export async function updatePricingPlanAction(id: string, updates: unknown) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = updatePricingPlanSchema.safeParse({ id, updates });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const setClause: Partial<typeof schema.pricingPlans.$inferInsert> = {
      updatedAt: new Date(),
    };

    const validatedUpdates = parsed.data.updates;

    if (validatedUpdates.name !== undefined) setClause.name = validatedUpdates.name;
    if (validatedUpdates.price !== undefined) setClause.price = validatedUpdates.price;
    if (validatedUpdates.period !== undefined) setClause.period = validatedUpdates.period;
    if (validatedUpdates.description !== undefined) setClause.description = validatedUpdates.description;
    if (validatedUpdates.features !== undefined) setClause.features = validatedUpdates.features;
    if (validatedUpdates.isPopular !== undefined) setClause.isPopular = validatedUpdates.isPopular;
    if (validatedUpdates.buttonText !== undefined) setClause.buttonText = validatedUpdates.buttonText;
    if (validatedUpdates.buttonLink !== undefined) setClause.buttonLink = validatedUpdates.buttonLink;

    await db
      .update(schema.pricingPlans)
      .set(setClause)
      .where(eq(schema.pricingPlans.id, parsed.data.id));

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_PRICING_PLAN',
      targetType: 'pricing_plan',
      targetId: parsed.data.id,
      metadata: { updates: validatedUpdates },
      strict: true,
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

    const parsedId = uuidField.safeParse(id);
    if (!parsedId.success) {
      throw new Error('Invalid ID format.');
    }

    await db.delete(schema.pricingPlans).where(eq(schema.pricingPlans.id, parsedId.data));

    await logAuditAction({
      userId: user.id,
      action: 'DELETE_PRICING_PLAN',
      targetType: 'pricing_plan',
      targetId: parsedId.data,
      strict: true,
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

    const parsedId = uuidField.safeParse(id);
    if (!parsedId.success) {
      throw new Error('Invalid ID format.');
    }

    // 1. Fetch the contact submission
    const [submission] = await db
      .select()
      .from(schema.contactSubmissions)
      .where(eq(schema.contactSubmissions.id, parsedId.data))
      .limit(1);

    if (!submission) {
      throw new Error('Contact request not found.');
    }

    // 2. Update status in DB
    await db
      .update(schema.contactSubmissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.contactSubmissions.id, parsedId.data));

    // 3. Search and Sync Clerk user role
    try {
      const client = await clerkClient();
      const userList = await client.users.getUserList({
        emailAddress: [submission.email],
        limit: 1,
      });

      const clerkUser = userList.data?.[0];
      if (clerkUser) {
        if (isSuperAdminUser(clerkUser)) {
          logger.info('Skipped role sync for superadmin user', { userId: clerkUser.id });
        } else if (status !== 'pending') {
          const nextRole = status === 'connected' ? 'vendor' : 'customer';
          await client.users.updateUserMetadata(clerkUser.id, {
            publicMetadata: {
              role: nextRole,
            },
          });
          invalidateClerkUserCache(clerkUser.id);
          logger.info('Successfully updated Clerk user role', { userId: clerkUser.id, role: nextRole });
        }
      } else {
        logger.info('No Clerk user found with email to sync role', { email: submission.email });
      }
    } catch (clerkErr) {
      logger.error('Failed to update user role in Clerk', {
        error: clerkErr instanceof Error ? clerkErr.message : String(clerkErr),
        email: submission.email,
      });
      // We don't fail the whole request, but log it so the superadmin knows.
    }

    await logAuditAction({
      userId: adminUser.id,
      action: 'UPDATE_CONTACT_STATUS',
      targetType: 'contact',
      targetId: parsedId.data,
      metadata: { status, email: submission.email },
      strict: true,
    });

    revalidatePath('/superadmin');
    return { success: true };
  });
}

// ── GDPR COMPLIANCE (DSAR & RIGHT TO BE FORGOTTEN) ─────────────

export async function getCustomerDsarDataAction(email: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const normalizedEmailInput = email.trim().toLowerCase();
    if (!normalizedEmailInput) {
      throw new Error('Email address is required.');
    }

    // 1. Fetch matching orders using the blind index (keyed-hash)
    const targetHash = hashPii(normalizedEmailInput);
    const orders = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.customerEmailHash, targetHash!));
      
    const matchingOrders = [];
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const allItems = await db
        .select()
        .from(schema.simulatedOrderItems)
        .where(inArray(schema.simulatedOrderItems.orderId, orderIds));
      
      for (const order of orders) {
        matchingOrders.push({
          ...order,
          items: allItems.filter(i => i.orderId === order.id),
        });
      }
    }

    // 2. Fetch matching contact submissions using the blind index
    const matchingSubmissions = await db
      .select()
      .from(schema.contactSubmissions)
      .where(eq(schema.contactSubmissions.emailHash, targetHash!));

    await logAuditAction({
      userId: user.id,
      action: 'GDPR_DSAR_EXPORT',
      targetType: 'simulated_order',
      targetId: normalizedEmailInput,
      metadata: { ordersCount: matchingOrders.length, contactSubmissionsCount: matchingSubmissions.length },
      strict: true,
    });

    return {
      success: true,
      data: {
        email: normalizedEmailInput,
        orders: matchingOrders,
        contactSubmissions: matchingSubmissions,
      },
    };
  });
}

export async function anonymizeCustomerDataAction(email: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const normalizedEmailInput = email.trim().toLowerCase();
    if (!normalizedEmailInput) {
      throw new Error('Email address is required.');
    }

    // 0. Fetch Clerk user and optionally delete them
    const client = await clerkClient();
    const clerkUserList = await client.users.getUserList({ emailAddress: [normalizedEmailInput], limit: 1 });
    const clerkUser = clerkUserList.data?.[0];
    let clerkUserId = null;
    let clerkProfileDeleted = false;
    
    if (clerkUser) {
      clerkUserId = clerkUser.id;
      if (!isSuperAdminUser(clerkUser)) {
        await client.users.deleteUser(clerkUserId);
        clerkProfileDeleted = true;
      }
    }

    // 1. Fetch matching orders
    const targetHash = hashPii(normalizedEmailInput);
    const conditions = [];
    if (targetHash) conditions.push(eq(schema.simulatedOrders.customerEmailHash, targetHash!));
    if (clerkUserId) conditions.push(eq(schema.simulatedOrders.customerUserId, clerkUserId));
    
    const matchingOrders = conditions.length > 0 
      ? await db.select().from(schema.simulatedOrders).where(or(...conditions))
      : [];
      
    let ordersAnonymized = 0;
    let paymentSlipsDeleted = 0;
    
    // Lazy load supabase admin if needed
    let supabase: any = null;
    const { createSupabaseAdminClient, isSupabaseStorageConfigured } = await import('@/shared/storage/admin-client');
    const { PAYMENT_SLIPS_BUCKET } = await import('@/shared/storage/config');

    const orderIds = matchingOrders.map(o => o.id);
    const paymentSlipUrls = matchingOrders.map(o => o.paymentSlipUrl).filter(Boolean) as string[];

    if (paymentSlipUrls.length > 0 && isSupabaseStorageConfigured()) {
      supabase = createSupabaseAdminClient();
      await supabase.storage.from(PAYMENT_SLIPS_BUCKET).remove(paymentSlipUrls);
      paymentSlipsDeleted = paymentSlipUrls.length;
    }

    if (orderIds.length > 0) {
      await db
        .update(schema.simulatedOrders)
        .set({
          customerName: 'GDPR REDACTED',
          customerEmail: 'redacted@example.com',
          customerUserId: null,
          shippingAddress: 'REDACTED',
          shippingPhone: 'REDACTED',
          paymentSlipUrl: null,
          updatedAt: new Date(),
        })
        .where(inArray(schema.simulatedOrders.id, orderIds));
      ordersAnonymized = orderIds.length;
    }

    // 2. Fetch matching contact submissions and delete them
    const matchingSubmissions = targetHash 
      ? await db.select().from(schema.contactSubmissions).where(eq(schema.contactSubmissions.emailHash, targetHash!))
      : [];
      
    let submissionsDeleted = 0;
    if (matchingSubmissions.length > 0) {
      const subIds = matchingSubmissions.map(s => s.id);
      await db
        .delete(schema.contactSubmissions)
        .where(inArray(schema.contactSubmissions.id, subIds));
      submissionsDeleted = subIds.length;
    }

    let reviewsRedacted = 0;
    let wishlistsDeleted = 0;
    let questionsRedacted = 0;
    let auditLogsRedacted = 0;

    // 3. Scrub secondary PII tables using clerkUserId
    if (clerkUserId) {
      // Reviews
      const userReviews = await db.select({ id: schema.reviews.id }).from(schema.reviews).where(eq(schema.reviews.userId, clerkUserId));
      if (userReviews.length > 0) {
        await db.update(schema.reviews).set({
          userName: 'GDPR REDACTED',
          userImageUrl: null,
          comment: '[REDACTED]',
        }).where(eq(schema.reviews.userId, clerkUserId));
        reviewsRedacted = userReviews.length;
      }

      // Wishlists
      const userWishlists = await db.select({ id: schema.wishlists.id }).from(schema.wishlists).where(eq(schema.wishlists.userId, clerkUserId));
      if (userWishlists.length > 0) {
        await db.delete(schema.wishlists).where(eq(schema.wishlists.userId, clerkUserId));
        wishlistsDeleted = userWishlists.length;
      }

      // Questions
      const userQuestions = await db.select({ id: schema.questions.id }).from(schema.questions).where(eq(schema.questions.userId, clerkUserId));
      if (userQuestions.length > 0) {
        await db.update(schema.questions).set({
          userName: 'GDPR REDACTED',
          userImageUrl: null,
        }).where(eq(schema.questions.userId, clerkUserId));
        questionsRedacted = userQuestions.length;
      }

      // Audit Logs
      const userLogs = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.userId, clerkUserId));
      if (userLogs.length > 0) {
        await db.update(schema.auditLogs).set({
          userId: 'gdpr_redacted',
          ipAddress: null,
          userAgent: null,
        }).where(eq(schema.auditLogs.userId, clerkUserId));
        auditLogsRedacted = userLogs.length;
      }
    }

    await logAuditAction({
      userId: user.id,
      action: 'GDPR_ERASURE_ANONYMIZE',
      targetType: 'simulated_order',
      targetId: normalizedEmailInput,
      metadata: { 
        ordersAnonymized, 
        submissionsDeleted, 
        clerkProfileDeleted, 
        paymentSlipsDeleted, 
        reviewsRedacted, 
        wishlistsDeleted, 
        questionsRedacted, 
        auditLogsRedacted 
      },
      strict: true,
    });

    revalidatePath('/superadmin');
    return {
      success: true as const,
      count: {
        ordersAnonymized,
        submissionsDeleted,
        clerkProfileDeleted,
        paymentSlipsDeleted,
        reviewsRedacted,
        wishlistsDeleted,
        questionsRedacted,
        auditLogsRedacted
      },
    };
  });
}

