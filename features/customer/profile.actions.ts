'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod/v3';
import { phoneField, postalCodeField } from '@/shared/validation/primitives';
import { logger } from '@/shared/logging/logger';
import { rateLimit } from '@/shared/security/rate-limit';
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

export async function updateCustomerDeliveryDetailsAction(input: UpdateDeliverySettingsInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Unauthorized.' };
    }

    try {
      await rateLimit(5, 60000);
    } catch (error: any) {
      return { success: false as const, error: error.message || 'Too many requests. Please try again later.' };
    }

    const parsed = updateDeliverySettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || 'Invalid delivery details.' };
    }

    const data = parsed.data;

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
  } catch (error) {
    logger.error('Failed to update customer delivery details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false as const, error: 'Failed to update delivery settings. Please try again.' };
  }
}
