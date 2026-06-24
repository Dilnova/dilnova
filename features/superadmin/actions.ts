'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import { createPricingPlanSchema, updatePricingPlanSchema } from './schema';
import { uuidField } from '@/shared/validation/primitives';
import { logger } from '@/shared/logging/logger';

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
          revalidateTag('clerk-user-role', 'max');
          revalidateTag('clerk-user-superadmin', 'max');
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

    // 1. Fetch all orders & decrypt customerEmail in memory to filter
    // ACCEPTED RISK: These queries scan all rows because PII is encrypted and cannot be indexed.
    // Document this as an accepted trade-off for GDPR-at-rest encryption.
    // Consider implementing a keyed-hash index column for email lookups.
    const allOrders = await db.select().from(schema.simulatedOrders);
    const matchingOrders = [];
    for (const order of allOrders) {
      if (order.customerEmail && order.customerEmail.trim().toLowerCase() === normalizedEmailInput) {
        // Fetch order items
        const items = await db
          .select()
          .from(schema.simulatedOrderItems)
          .where(eq(schema.simulatedOrderItems.orderId, order.id));
        matchingOrders.push({
          ...order,
          items,
        });
      }
    }

    // 2. Fetch all contact submissions & filter by email
    const allSubmissions = await db.select().from(schema.contactSubmissions);
    const matchingSubmissions = allSubmissions.filter(
      (sub) => sub.email && sub.email.trim().toLowerCase() === normalizedEmailInput
    );

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

    // 1. Fetch all orders and find matching ones
    // ACCEPTED RISK: These queries scan all rows because PII is encrypted and cannot be indexed.
    // Document this as an accepted trade-off for GDPR-at-rest encryption.
    // Consider implementing a keyed-hash index column for email lookups.
    const allOrders = await db.select().from(schema.simulatedOrders);
    let ordersAnonymized = 0;
    let paymentSlipsDeleted = 0;
    
    // Lazy load supabase admin if needed
    let supabase: any = null;
    const { createSupabaseAdminClient, isSupabaseStorageConfigured } = await import('@/shared/storage/admin-client');
    const { PAYMENT_SLIPS_BUCKET } = await import('@/shared/storage/config');

    for (const order of allOrders) {
      if (
        (order.customerEmail && order.customerEmail.trim().toLowerCase() === normalizedEmailInput) ||
        (clerkUserId && order.customerUserId === clerkUserId)
      ) {
        // Remove Supabase payment slip if exists
        if (order.paymentSlipUrl && isSupabaseStorageConfigured()) {
          if (!supabase) supabase = createSupabaseAdminClient();
          await supabase.storage.from(PAYMENT_SLIPS_BUCKET).remove([order.paymentSlipUrl]);
          paymentSlipsDeleted++;
        }

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
          .where(eq(schema.simulatedOrders.id, order.id));
        ordersAnonymized++;
      }
    }

    // 2. Fetch matching contact submissions and delete them
    const allSubmissions = await db.select().from(schema.contactSubmissions);
    let submissionsDeleted = 0;
    for (const sub of allSubmissions) {
      if (sub.email && sub.email.trim().toLowerCase() === normalizedEmailInput) {
        await db
          .delete(schema.contactSubmissions)
          .where(eq(schema.contactSubmissions.id, sub.id));
        submissionsDeleted++;
      }
    }

    let reviewsRedacted = 0;
    let wishlistsDeleted = 0;
    let questionsRedacted = 0;
    let auditLogsRedacted = 0;

    // 3. Scrub secondary PII tables using clerkUserId
    if (clerkUserId) {
      // Reviews
      const userReviews = await db.select().from(schema.reviews).where(eq(schema.reviews.userId, clerkUserId));
      for (const review of userReviews) {
        await db.update(schema.reviews).set({
          userName: 'GDPR REDACTED',
          userImageUrl: null,
          comment: '[REDACTED]',
        }).where(eq(schema.reviews.id, review.id));
        reviewsRedacted++;
      }

      // Wishlists
      const userWishlists = await db.select().from(schema.wishlists).where(eq(schema.wishlists.userId, clerkUserId));
      for (const wl of userWishlists) {
        await db.delete(schema.wishlists).where(eq(schema.wishlists.id, wl.id));
        wishlistsDeleted++;
      }

      // Questions
      const userQuestions = await db.select().from(schema.questions).where(eq(schema.questions.userId, clerkUserId));
      for (const q of userQuestions) {
        await db.update(schema.questions).set({
          userName: 'GDPR REDACTED',
          userImageUrl: null,
        }).where(eq(schema.questions.id, q.id));
        questionsRedacted++;
      }

      // Audit Logs
      const userLogs = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.userId, clerkUserId));
      for (const log of userLogs) {
        await db.update(schema.auditLogs).set({
          userId: 'gdpr_redacted',
          ipAddress: null,
          userAgent: null,
        }).where(eq(schema.auditLogs.id, log.id));
        auditLogsRedacted++;
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

