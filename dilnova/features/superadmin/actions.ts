'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';

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
