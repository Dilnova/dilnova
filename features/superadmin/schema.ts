import { z } from 'zod/v3';
import { uuidField } from '@/shared/validation/primitives';

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
  requiresPickup: z.boolean().optional(),
}).strict();

export const updateCheckoutOptionsCatalogSchema = z.object({
  options: z.array(checkoutOptionDefinitionSchema).min(1, 'At least one checkout option is required.'),
});

export const createPricingPlanSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100, 'Name cannot exceed 100 characters.').trim(),
  price: z.string().min(1, 'Price is required.').max(50, 'Price cannot exceed 50 characters.').trim(),
  period: z.string().min(1, 'Period is required.').max(50, 'Period cannot exceed 50 characters.').trim(),
  description: z.string().max(500, 'Description cannot exceed 500 characters.').trim().optional().nullable(),
  features: z.array(z.string().max(150, 'Each feature cannot exceed 150 characters.').trim())
    .max(50, 'Cannot exceed 50 features.'),
  isPopular: z.boolean(),
  buttonText: z.string().min(1, 'Button text is required.').max(50, 'Button text cannot exceed 50 characters.').trim(),
  buttonLink: z.string()
    .min(1, 'Button link is required.')
    .max(1000, 'Button link cannot exceed 1000 characters.')
    .trim()
    .refine(
      (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
      'Button link must be a relative path starting with "/" or an absolute URL starting with "http://" or "https://".'
    ),
});

export const updatePricingPlanSchema = z.object({
  id: uuidField,
  updates: createPricingPlanSchema.partial(),
});

export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingSchema>;
export type UpdateCheckoutOptionsCatalogInput = z.infer<typeof updateCheckoutOptionsCatalogSchema>;
export type CreatePricingPlanInput = z.infer<typeof createPricingPlanSchema>;
export type UpdatePricingPlanInput = z.infer<typeof updatePricingPlanSchema>;
