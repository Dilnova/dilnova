'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { updateSystemSettingSchema } from '@/features/superadmin/schema';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';

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
      strict: true,
    });

    // Clear cache for admin panels and vendor portals to reflect configuration updates immediately
    revalidateTag('system-settings', 'max');
    revalidatePath('/superadmin');
    revalidateVendorConsole();
    revalidatePath('/', 'layout');
  });
}
