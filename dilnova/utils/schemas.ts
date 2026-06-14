/** @deprecated Import from `@/features/<domain>/schema` — migration shim. */

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

export {
  updateSystemSettingSchema,
  updateCheckoutOptionsCatalogSchema,
} from '@/features/superadmin/schema';

export { updateOrgCheckoutOptionsSchema } from '@/features/organization/schema';

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
  updateImsLicenseSchema,
} from '@/features/inventory/schema';

export { processBillingCheckoutSchema } from '@/features/billing/schema';

export {
  submitPaymentSlipSchema,
  vendorOrderActionSchema,
  rejectPaymentSlipSchema,
  updateSimulatedOrderStatusSchema,
} from '@/features/orders/schema';

export { updateMemberRoleSchema } from '@/features/admin/schema';

export { vendorMetadataSchema } from '@/features/vendor/schema';
