import { z } from 'zod/v3';

export const vendorMetadataSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required.'),
  data: z.object({
    description: z.string().max(1000, 'Description cannot exceed 1000 characters.').trim().default(''),
    address: z.string().max(250, 'Address cannot exceed 250 characters.').trim().default(''),
    phone: z.string().max(50, 'Phone cannot exceed 50 characters.').trim().default(''),
    bannerUrl: z.string().trim().default('')
      .refine(
        (val) => val === '' || val.startsWith('https://'),
        { message: 'Banner URL must use HTTPS.' }
      ),
    stockAllocationMode: z.enum(['target_branch', 'central_intake']).default('central_intake'),
    bankName: z.string().max(100, 'Bank name cannot exceed 100 characters.').trim().default(''),
    bankAccountName: z.string().max(100, 'Account name cannot exceed 100 characters.').trim().default(''),
    bankAccountNumber: z.string().max(50, 'Account number cannot exceed 50 characters.').trim().default(''),
    bankBranchCode: z.string().max(50, 'Branch code cannot exceed 50 characters.').trim().default(''),
    bankTransferInstructions: z
      .string()
      .max(500, 'Transfer instructions cannot exceed 500 characters.')
      .trim()
      .default(''),
  }),
});

export type VendorMetadataInput = z.infer<typeof vendorMetadataSchema>['data'];
