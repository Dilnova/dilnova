import { z } from 'zod/v3';

export const updateSystemSettingSchema = z.object({
  key: z.string().min(1, 'Setting key cannot be empty.').max(100).trim(),
  value: z.string().max(1000, 'Setting value is too long.').trim(),
});

const checkoutOptionDefinitionSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Option ID must be lowercase letters, numbers, and underscores.'),
  label: z.string().min(1, 'Label is required.').max(100).trim(),
  description: z.string().max(250).trim().optional(),
  type: z.enum(['fulfillment', 'payment']),
  platformEnabled: z.boolean(),
  isBuiltIn: z.boolean().optional(),
  zeroShipping: z.boolean().optional(),
  requiresBranch: z.boolean().optional(),
  pendingPayment: z.boolean().optional(),
  requiresDelivery: z.boolean().optional(),
});

export const updateCheckoutOptionsCatalogSchema = z.object({
  options: z.array(checkoutOptionDefinitionSchema).min(1, 'At least one checkout option is required.'),
});

export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingSchema>;
export type UpdateCheckoutOptionsCatalogInput = z.infer<typeof updateCheckoutOptionsCatalogSchema>;
