import { z } from "zod/v3";

export const updateOrgCheckoutOptionsSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required."),
  checkoutOptions: z.record(z.string(), z.boolean()),
});

export type UpdateOrgCheckoutOptionsInput = z.infer<typeof updateOrgCheckoutOptionsSchema>;

export const updateOrgCurrencySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required."),
  baseCurrency: z.string().min(3).max(3),
  fxMarkupPercent: z.number().min(0).max(10).default(0),
  defaultTaxClassId: z.string().uuid().nullable().optional(),
});

export type UpdateOrgCurrencyInput = z.infer<typeof updateOrgCurrencySchema>;

export const updateOrgDefaultTaxSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required."),
  defaultTaxClassId: z.string().uuid().nullable().optional(),
  customTaxName: z.string().max(100).optional(),
  customTaxRatePercent: z.number().min(0).max(100).nullable().optional(),
  allowedTaxClassIds: z.array(z.string().uuid()).optional(),
});

export type UpdateOrgDefaultTaxInput = z.infer<typeof updateOrgDefaultTaxSchema>;
