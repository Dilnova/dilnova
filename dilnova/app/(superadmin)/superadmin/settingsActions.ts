'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { updateSystemSettingSchema } from '@/utils/schemas';
import { checkSuperAdmin } from '@/utils/authGuards';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { rateLimit } from '@/utils/rateLimit';

/**
 * Enterprise Server Action to configure system-wide parameters (e.g., max media upload limit).
 * Restricted to authenticated global admin users.
 */
export async function updateSystemSettingAction(key: string, value: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000); // Max 20 superadmin operations per minute per IP
    const user = await checkSuperAdmin();

    // ── Schema Validation ──
    const parsed = updateSystemSettingSchema.safeParse({ key, value });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Check if setting already exists
    const [existing] = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, parsed.data.key))
      .limit(1);

    if (existing) {
      // Update
      await db
        .update(schema.systemSettings)
        .set({
          value: parsed.data.value,
          updatedAt: new Date(),
        })
        .where(eq(schema.systemSettings.key, parsed.data.key));
    } else {
      // Insert
      await db.insert(schema.systemSettings).values({
        key: parsed.data.key,
        value: parsed.data.value,
      });
    }

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_SYSTEM_SETTING',
      targetType: 'system_setting',
      targetId: parsed.data.key,
      metadata: { value: parsed.data.value },
    });

    // Clear cache for admin panels and vendor portals to reflect configuration updates immediately
    revalidatePath('/superadmin');
    revalidatePath('/vendor/products');
  });
}
