import { z } from 'zod/v3';
import { uuidField, phoneField } from '@/shared/validation/primitives';

const stockAvailabilityDefinitionSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Status ID must be lowercase letters, numbers, and underscores.'),
  label: z.string().min(1, 'Label is required.').max(100).trim(),
  description: z.string().max(250).trim().optional(),
  platformEnabled: z.boolean(),
  isBuiltIn: z.boolean().optional(),
  allowsPurchase: z.boolean(),
  badgeTone: z.enum(['emerald', 'rose', 'amber', 'blue', 'zinc']).optional(),
});

export const updateStockAvailabilityCatalogSchema = z.object({
  options: z.array(stockAvailabilityDefinitionSchema).min(1, 'At least one stock availability option is required.'),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required.').max(200, 'Supplier name cannot exceed 200 characters.').trim(),
  contactName: z.string().max(200).trim().optional().default(''),
  email: z.string().email('Invalid email format.').or(z.literal('')).optional().default(''),
  phone: phoneField.or(z.literal('')).optional().default(''),
  address: z.string().max(500).trim().optional().default(''),
});

export const updateSupplierSchema = createSupplierSchema.extend({
  id: uuidField,
});

export const deleteSupplierSchema = z.object({
  id: uuidField,
});

export const adjustInventorySchema = z.object({
  inventoryId: uuidField,
  quantityChange: z.number().int('Quantity must be a whole number.'),
  type: z.enum(['restock', 'manual_adjustment', 'damage_loss']),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters.').trim().optional().default(''),
  branchId: uuidField.optional(),
});

export const updateInventoryDetailsSchema = z.object({
  inventoryId: uuidField,
  sku: z.string().max(100).trim().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  binLocation: z.string().max(200).trim().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  stockAvailability: z.string().min(1).max(50).optional(),
});

export const initInventorySchema = z.object({
  productId: uuidField,
  sku: z.string().max(100).trim().optional(),
  quantity: z.number().int('Quantity must be a whole number.').min(0, 'Quantity cannot be negative.').optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  binLocation: z.string().max(200).trim().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  stockAvailability: z.string().min(1).max(50).optional(),
});

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required.').max(100, 'Branch name cannot exceed 100 characters.').trim(),
  address: z.string().max(300, 'Address cannot exceed 300 characters.').trim().optional().default(''),
  phone: phoneField.or(z.literal('')).optional().default(''),
});

export const updateBranchSchema = createBranchSchema.extend({
  id: uuidField,
});

export const deleteBranchSchema = z.object({
  id: uuidField,
});

export const allocateBranchStockSchema = z.object({
  branchId: uuidField,
  productId: uuidField,
  quantity: z.number().int('Quantity must be a whole number.').min(0, 'Quantity cannot be negative.'),
  sku: z.string().max(100).trim().optional().default(''),
  binLocation: z.string().max(200).trim().optional().default(''),
});

export const assignBranchMemberSchema = z.object({
  branchId: uuidField,
  memberUserId: z.string().min(1, 'Member user ID is required.'),
  role: z.enum(['cashier', 'manager']).default('cashier'),
});

export const removeBranchMemberSchema = z.object({
  id: uuidField,
});

export const updateImsLicenseSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required.'),
  imsEnabled: z.boolean().optional(),
  imsExpiresAt: z.string().nullable().optional(),
  imsMultiBranchEnabled: z.boolean().optional(),
  imsBillingEnabled: z.boolean().optional(),
  /** Override the default free-tier listing cap (10) for this org. Min: 1, Max: 100,000 */
  imsMaxListingCount: z.number().int('Must be a whole number.').min(1, 'Minimum is 1.').max(100_000, 'Maximum is 100,000.').optional(),
});
