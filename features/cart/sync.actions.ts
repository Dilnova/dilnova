'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { syncedCartSchema, type SyncedCartItem } from '@/features/cart/schema';
import { rateLimit } from '@/shared/security/rate-limit';
import { logger } from '@/shared/logging/logger';
import { authenticatedAction } from '@/lib/safe-action';
import { z } from 'zod/v3';

export const loadCustomerCartAction = authenticatedAction
  .schema(z.object({}))
  .action(async ({ ctx }): Promise<{ success: boolean; items?: SyncedCartItem[]; error?: string }> => {
    try {
      await rateLimit(30, 60 * 1000);

      const [row] = await db
        .select()
        .from(schema.customerCarts)
        .where(eq(schema.customerCarts.userId, ctx.userId))
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
      logger.error('Failed to load customer cart', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, error: 'Failed to load saved cart.' };
    }
  });

export const saveCustomerCartAction = authenticatedAction
  .schema(
    z.object({
      items: syncedCartSchema,
    })
  )
  .action(async ({ parsedInput, ctx }): Promise<{ success: boolean; error?: string }> => {
    try {
      await rateLimit(30, 60 * 1000);

      await db
        .insert(schema.customerCarts)
        .values({
          userId: ctx.userId,
          itemsJson: JSON.stringify(parsedInput.items),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.customerCarts.userId,
          set: {
            itemsJson: JSON.stringify(parsedInput.items),
            updatedAt: new Date(),
          },
        });

      return { success: true };
    } catch (error) {
      logger.error('Failed to save customer cart', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, error: 'Failed to save cart.' };
    }
  });
