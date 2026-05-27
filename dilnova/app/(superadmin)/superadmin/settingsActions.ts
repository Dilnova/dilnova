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

/**
 * Enterprise Server Action to configure system-wide parameters (e.g., max media upload limit).
 * Restricted to authenticated global admin users.
 */
export async function updateSystemSettingAction(key: string, value: string) {
  await checkSuperAdmin();

  const trimmedKey = key.trim();
  const trimmedValue = value.trim();

  if (!trimmedKey) {
    throw new Error('Setting key cannot be empty.');
  }

  // Check if setting already exists
  const [existing] = await db
    .select()
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, trimmedKey))
    .limit(1);

  if (existing) {
    // Update
    await db
      .update(schema.systemSettings)
      .set({
        value: trimmedValue,
        updatedAt: new Date(),
      })
      .where(eq(schema.systemSettings.key, trimmedKey));
  } else {
    // Insert
    await db.insert(schema.systemSettings).values({
      key: trimmedKey,
      value: trimmedValue,
    });
  }

  // Clear cache for admin panels and vendor portals to reflect configuration updates immediately
  revalidatePath('/superadmin');
  revalidatePath('/vendor/products');
}
