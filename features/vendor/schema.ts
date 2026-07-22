import { z } from "zod/v3";
import { optionalCloudinaryUrlSchema } from "@/shared/media/validate-cloudinary-media";
import { phoneField, bankAccountField } from "@/shared/validation/primitives";

export const vendorMetadataSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required."),
  data: z.object({
    description: z
      .string()
      .max(1000, "Description cannot exceed 1000 characters.")
      .trim()
      .default(""),
    address: z.string().max(250, "Address cannot exceed 250 characters.").trim().default(""),
    phone: phoneField.or(z.literal("")).default(""),
    bannerUrl: optionalCloudinaryUrlSchema,
    stockAllocationMode: z.enum(["target_branch", "central_intake"]).default("central_intake"),
    bankName: z.string().max(100, "Bank name cannot exceed 100 characters.").trim().default(""),
    bankAccountName: z
      .string()
      .max(100, "Account name cannot exceed 100 characters.")
      .trim()
      .default(""),
    bankAccountNumber: bankAccountField.or(z.literal("")).default(""),
    bankBranchCode: bankAccountField.or(z.literal("")).default(""),
    bankTransferInstructions: z
      .string()
      .max(500, "Transfer instructions cannot exceed 500 characters.")
      .trim()
      .default(""),
  }),
});

export type VendorMetadataInput = z.infer<typeof vendorMetadataSchema>["data"];
