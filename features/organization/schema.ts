import { z } from 'zod/v3';

export const updateOrgCheckoutOptionsSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required.'),
  checkoutOptions: z.record(z.string(), z.boolean()),
});

export type UpdateOrgCheckoutOptionsInput = z.infer<typeof updateOrgCheckoutOptionsSchema>;
