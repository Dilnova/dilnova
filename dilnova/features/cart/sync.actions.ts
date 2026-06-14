'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { syncedCartItemSchema, syncedCartSchema, type SyncedCartItem } from '@/features/cart/schema';

export type { SyncedCartItem };

export async function loadCustomerCartAction(): Promise<{
  success: boolean;
  items?: SyncedCartItem[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not signed in.' };
    }

    const [row] = await db
      .select()
      .from(schema.customerCarts)
      .where(eq(schema.customerCarts.userId, userId))
      .limit(1);

    if (!row) {
      return { success: true, items: [] };
    }

    const parsed = syncedCartSchema.safeParse(JSON.parse(row.itemsJson || '[]'));
    if (!parsed.success) {
      return { success: true, items: [] };
    }

    return { success: true, items: parsed.data };
  } catch (error) {
    console.error('Failed to load customer cart:', error);
    return { success: false, error: 'Failed to load saved cart.' };
  }
}

export async function saveCustomerCartAction(
  items: SyncedCartItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not signed in.' };
    }

    const parsed = syncedCartSchema.safeParse(items);
    if (!parsed.success) {
      return { success: false, error: 'Invalid cart data.' };
    }

    await db
      .insert(schema.customerCarts)
      .values({
        userId,
        itemsJson: JSON.stringify(parsed.data),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.customerCarts.userId,
        set: {
          itemsJson: JSON.stringify(parsed.data),
          updatedAt: new Date(),
        },
      });

    return { success: true };
  } catch (error) {
    console.error('Failed to save customer cart:', error);
    return { success: false, error: 'Failed to save cart.' };
  }
}

// Re-export schema for callers that validate single items
export { syncedCartItemSchema };
