'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod/v3';
import { phoneField, postalCodeField } from '@/shared/validation/primitives';
import { logger } from '@/shared/logging/logger';
import { rateLimit } from '@/shared/security/rate-limit';
import { authenticatedAction, ActionError } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';

const updateDeliverySettingsSchema = z.object({
  shippingAddress: z.string().max(500).trim().min(5, 'Street address must be at least 5 characters.'),
  shippingAddressLine2: z.string().max(500).trim().optional().nullable(),
  shippingCity: z.string().max(200).trim().min(1, 'City is required.'),
  shippingState: z.string().max(200).trim().min(1, 'State is required.'),
  shippingPostalCode: postalCodeField,
  shippingCountry: z.string().max(200).trim().optional().nullable(),
  shippingPhone: phoneField.or(z.literal('')).optional().nullable(),
  shippingPhone2: phoneField.or(z.literal('')).optional().nullable(),
});

export type UpdateDeliverySettingsInput = z.infer<typeof updateDeliverySettingsSchema>;

export const updateCustomerDeliveryDetailsAction = authenticatedAction
  .schema(updateDeliverySettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId } = ctx;

    try {
      await rateLimit(5, 60000);
    } catch (error: any) {
      logger.warn('Rate limit exceeded during delivery details update', { userId, error: error?.message });
      throw new ActionError('Too many requests. Please try again later.');
    }

    const data = parsedInput;

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        shippingAddress: data.shippingAddress,
        shippingAddressLine2: data.shippingAddressLine2 || '',
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingPostalCode: data.shippingPostalCode,
        shippingCountry: data.shippingCountry || '',
        shippingPhone: data.shippingPhone || '',
        shippingPhone2: data.shippingPhone2 || '',
      },
    });

    revalidatePath('/customer');
    revalidatePath('/cart');

    return { success: true as const };
  });
