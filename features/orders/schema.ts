import { z } from "zod/v3";
import { uuidField } from "@/shared/validation/primitives";

export const updateSimulatedOrderStatusSchema = z.object({
  orderId: uuidField,
  status: z.enum(["pending", "fulfilled", "cancelled"]),
});

export const uploadPaymentSlipFormSchema = z.object({
  orderId: uuidField,
});

export const vendorOrderActionSchema = z.object({
  orderId: uuidField,
});

export const rejectPaymentSlipSchema = vendorOrderActionSchema.extend({
  reason: z.string().max(500).trim().optional(),
});

export type UploadPaymentSlipFormInput = z.infer<typeof uploadPaymentSlipFormSchema>;
export type VendorOrderActionInput = z.infer<typeof vendorOrderActionSchema>;
