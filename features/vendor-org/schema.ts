import { z } from "zod/v3";
import { uuidField } from "@/shared/validation/primitives";

export const reassignVendorOrgSchema = z.object({
  fromOrgId: z.string().min(1, "Source organization ID is required.").max(100).trim(),
  toOrgId: z.string().min(1, "Target organization ID is required.").max(100).trim(),
  scopes: z.object({
    products: z.boolean(),
    orderItems: z.boolean(),
    suppliers: z.boolean(),
    branches: z.boolean(),
    billingReceipts: z.boolean(),
  }),
});

export const reassignProductOrgSchema = z.object({
  productId: uuidField,
  toOrgId: z.string().min(1, "Target organization ID is required.").max(100).trim(),
});

export type ReassignVendorOrgInput = z.infer<typeof reassignVendorOrgSchema>;
export type ReassignProductOrgInput = z.infer<typeof reassignProductOrgSchema>;
