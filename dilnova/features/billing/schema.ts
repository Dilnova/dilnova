import { z } from 'zod/v3';
import { uuidField } from '@/shared/validation/primitives';

export const processBillingCheckoutSchema = z.object({
  branchId: uuidField,
  items: z.array(
    z.object({
      productId: uuidField,
      productName: z.string().min(1),
      quantity: z.number().int().min(1, 'Quantity must be at least 1.'),
      unitPrice: z.number().int().min(0, 'Price cannot be negative.'),
    })
  ).min(1, 'At least one item is required.'),
  paymentMethod: z.enum(['cash', 'card', 'other']).default('cash'),
  customerName: z.string().max(200).trim().optional().default(''),
  notes: z.string().max(500).trim().optional().default(''),
});
