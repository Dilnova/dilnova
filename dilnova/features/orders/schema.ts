import { z } from 'zod/v3';
import { isAllowedCloudinaryDeliveryUrl } from '@/utils/cloudinaryUrl';
import { uuidField } from '@/shared/validation/primitives';

export const updateSimulatedOrderStatusSchema = z.object({
  orderId: uuidField,
  status: z.enum(['pending', 'fulfilled', 'cancelled']),
});

export const submitPaymentSlipSchema = z.object({
  orderId: uuidField,
  slipUrl: z
    .string()
    .url('A valid slip image URL is required.')
    .max(2048)
    .refine(
      (url) => isAllowedCloudinaryDeliveryUrl(url),
      'Payment slip must be uploaded through Cloudinary.'
    ),
  customerEmail: z.string().email().max(255).optional(),
});

export const vendorOrderActionSchema = z.object({
  orderId: uuidField,
});

export const rejectPaymentSlipSchema = vendorOrderActionSchema.extend({
  reason: z.string().max(500).trim().optional(),
});

export type SubmitPaymentSlipInput = z.infer<typeof submitPaymentSlipSchema>;
export type VendorOrderActionInput = z.infer<typeof vendorOrderActionSchema>;
