import { z } from 'zod/v3';
import { isAllowedCloudinaryDeliveryUrl } from '@/utils/cloudinaryUrl';

// ═══════════════════════════════════════════════════════════
// SHARED ZOD SCHEMAS — Enterprise Input Validation
// ═══════════════════════════════════════════════════════════
// All server action inputs are validated at the boundary using
// these schemas before any database or API calls are made.

/** Reusable UUID v4 string validator */
const uuidField = z.string().uuid('Invalid ID format.');

// ── Product Actions ──────────────────────────────────────

export {
  toggleWishlistSchema,
  submitReviewSchema,
  submitQuestionSchema,
  submitAnswerSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  updateProductSchema,
  deleteProductSchema,
  addProductSchema,
  vendorDeleteProductSchema,
  incrementViewsSchema,
} from '@/features/catalog/schema';

export {
  reassignProductOrgSchema,
  reassignVendorOrgSchema,
} from '@/features/vendor-org/schema';

// ── Superadmin: System Settings ──────────────────────────

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
});

export const updateCheckoutOptionsCatalogSchema = z.object({
  options: z.array(checkoutOptionDefinitionSchema).min(1, 'At least one checkout option is required.'),
});

export const updateOrgCheckoutOptionsSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required.'),
  checkoutOptions: z.record(z.string(), z.boolean()),
});

export {
  updateStockAvailabilityCatalogSchema,
  createSupplierSchema,
  updateSupplierSchema,
  deleteSupplierSchema,
  adjustInventorySchema,
  updateInventoryDetailsSchema,
  createBranchSchema,
  updateBranchSchema,
  deleteBranchSchema,
  allocateBranchStockSchema,
  assignBranchMemberSchema,
  removeBranchMemberSchema,
  processBillingCheckoutSchema,
  updateImsLicenseSchema,
} from '@/features/inventory/schema';

export {
  submitPaymentSlipSchema,
  vendorOrderActionSchema,
  rejectPaymentSlipSchema,
  updateSimulatedOrderStatusSchema,
} from '@/features/orders/schema';

// ── Admin: Organization Member Role ──────────────────────

const ALLOWED_ORG_ROLES = ['org:member', 'org:admin', 'org:vendor', 'org:customer'] as const;

export const updateMemberRoleSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required.'),
  userId: z.string().min(1, 'User ID is required.'),
  newRole: z.enum(ALLOWED_ORG_ROLES, {
    errorMap: () => ({ message: 'Invalid role specified.' }),
  }),
});

// ── Vendor: Profile Metadata ─────────────────────────────

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

