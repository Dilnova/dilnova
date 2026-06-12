'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as schema from '@/db/schema';

const syncedCartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(),
  quantity: z.number().int().positive(),
  vendorName: z.string(),
  type: z.string(),
});

const syncedCartSchema = z.array(syncedCartItemSchema).max(100);

export type SyncedCartItem = z.infer<typeof syncedCartItemSchema>;

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
