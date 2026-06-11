import { pgTable, text, timestamp, integer, uuid, AnyPgColumn, unique, jsonb, index, boolean, real } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'cascade' }),
  localizedNames: jsonb('localized_names').$type<Record<string, string>>(),
  localizedDescriptions: jsonb('localized_descriptions').$type<Record<string, string>>(),
  metadataTemplateId: uuid('metadata_template_id').references(() => metadataTemplates.id, { onDelete: 'set null' }),
  taxClassId: uuid('tax_class_id').references(() => taxClasses.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_categories_parent').on(t.parentId),
  index('idx_categories_slug').on(t.slug),
]);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').default('product').notNull(), // 'product' | 'service' | 'living_organism' | etc.
  description: text('description'),
  price: integer('price').notNull(), // price in cents (e.g. 999 for $9.99)
  imageUrl: text('image_url'),
  orgId: text('org_id').notNull(), // Links to Clerk Organization ID
  categoryId: uuid('category_id').references(() => categories.id), // Links to category
  views: integer('views').default(0).notNull(),
  media: jsonb('media').$type<{ url: string; type: 'image' | 'video' }[]>().default([]).notNull(),
  
  // New Enterprise properties
  sku: text('sku'),
  barcodes: jsonb('barcodes').$type<string[]>().default([]).notNull(),
  status: text('status').default('active').notNull(),
  attributes: jsonb('attributes').$type<Record<string, any>>().default({}).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_products_org_id').on(t.orgId),
  index('idx_products_category_id').on(t.categoryId),
  index('idx_products_created_at').on(t.createdAt),
  index('idx_products_attributes').on(t.attributes),
]);

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Clerk User ID
  userName: text('user_name').notNull(), // User Display Name
  userImageUrl: text('user_image_url'), // User Profile Photo
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_reviews_product_id').on(t.productId),
  index('idx_reviews_user_id').on(t.userId),
]);

export const wishlists = pgTable('wishlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk User ID
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('wishlist_user_product_unique').on(t.userId, t.productId),
  index('idx_wishlists_user_id').on(t.userId),
]);

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Customer Clerk User ID
  userName: text('user_name').notNull(), // Customer Display Name
  userImageUrl: text('user_image_url'), // Customer Profile Photo
  content: text('content').notNull(), // Question text
  answer: text('answer'), // Vendor Response
  answeredBy: text('answered_by'), // Vendor user/org identifier
  answeredAt: timestamp('answered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_questions_product_id').on(t.productId),
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(), // e.g., 'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'UPDATE_SYSTEM_SETTING', 'UPDATE_MEMBER_ROLE', 'UPDATE_VENDOR_METADATA', 'CREATE_PRODUCT', 'DELETE_PRODUCT'
  targetType: text('target_type').notNull(), // e.g., 'category', 'product', 'system_setting', 'membership', 'vendor'
  targetId: text('target_id').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_audit_logs_user_id').on(t.userId),
  index('idx_audit_logs_action').on(t.action),
  index('idx_audit_logs_created_at').on(t.createdAt),
]);

export const pricingPlans = pgTable('pricing_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  price: text('price').notNull(),
  period: text('period').default('/month').notNull(),
  description: text('description'),
  features: jsonb('features').$type<string[]>().default([]).notNull(),
  isPopular: boolean('is_popular').default(false).notNull(),
  buttonText: text('button_text').default('Get Started').notNull(),
  buttonLink: text('button_link').default('/contact').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contactSubmissions = pgTable('contact_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  category: text('category').notNull(), // 'collaboration' | 'registration' | 'info'
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'connected' | 'no_longer'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_contact_submissions_email').on(t.email),
  index('idx_contact_submissions_status').on(t.status),
]);

// ═══════════════════════════════════════════════════════════
// INVENTORY MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: text('org_id').notNull(), // Clerk Organization ID of the vendor who owns this supplier
  name: text('name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_suppliers_org_id').on(t.orgId),
]);

export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }).unique(),
  sku: text('sku'), // Stock Keeping Unit
  quantity: integer('quantity').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
  binLocation: text('bin_location'), // e.g. "Aisle 2, Shelf B"
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  stockAvailability: text('stock_availability').default('in_stock').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_inventory_product_id').on(t.productId),
  index('idx_inventory_supplier_id').on(t.supplierId),
  index('idx_inventory_sku').on(t.sku),
]);

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  inventoryId: uuid('inventory_id').notNull().references(() => inventory.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'restock' | 'sale_depletion' | 'manual_adjustment' | 'damage_loss' | 'order_cancellation'
  quantityChanged: integer('quantity_changed').notNull(), // positive or negative
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  reason: text('reason'),
  userId: text('user_id').notNull(), // Clerk User ID of the action performer
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_inventory_movements_inventory_id').on(t.inventoryId),
  index('idx_inventory_movements_type').on(t.type),
  index('idx_inventory_movements_created_at').on(t.createdAt),
]);

export const simulatedOrders = pgTable('simulated_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  totalAmount: integer('total_amount').notNull(), // in cents
  status: text('status').default('pending').notNull(), // 'pending' | 'fulfilled' | 'cancelled'
  fulfillmentMethod: text('fulfillment_method').default('standard_delivery').notNull(),
  paymentMethod: text('payment_method').default('pay_online').notNull(),
  pickupBranchId: uuid('pickup_branch_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_simulated_orders_status').on(t.status),
  index('idx_simulated_orders_created_at').on(t.createdAt),
  index('idx_simulated_orders_email').on(t.customerEmail),
]);

export const simulatedOrderItems = pgTable('simulated_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => simulatedOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(), // Snapshot at time of order
  vendorOrgId: text('vendor_org_id').notNull(), // Snapshot of the vendor's org
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(), // in cents, snapshot at time of order
}, (t) => [
  index('idx_simulated_order_items_order_id').on(t.orderId),
  index('idx_simulated_order_items_product_id').on(t.productId),
]);

// ═══════════════════════════════════════════════════════════
// MULTI-BRANCH & BILLING (Premium Features)
// ═══════════════════════════════════════════════════════════

/** Branches / store locations per vendor organization */
export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: text('org_id').notNull(), // Clerk Organization ID
  name: text('name').notNull(), // e.g. "Downtown Store", "Warehouse A"
  address: text('address'),
  phone: text('phone'),
  isDefault: boolean('is_default').default(false).notNull(), // The default/main branch
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_branches_org_id').on(t.orgId),
]);

/** Per-branch stock levels (extends the central `inventory` table) */
export const branchInventory = pgTable('branch_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku'), // Branch-specific SKU override
  quantity: integer('quantity').default(0).notNull(),
  binLocation: text('bin_location'), // Branch-specific bin/shelf location
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('branch_inventory_branch_product_unique').on(t.branchId, t.productId),
  index('idx_branch_inventory_branch_id').on(t.branchId),
  index('idx_branch_inventory_product_id').on(t.productId),
]);

/** Assigns organization members to specific branches with a role */
export const branchMembers = pgTable('branch_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  memberUserId: text('member_user_id').notNull(), // Clerk User ID
  role: text('role').default('cashier').notNull(), // 'cashier' | 'manager'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('branch_members_branch_user_unique').on(t.branchId, t.memberUserId),
  index('idx_branch_members_branch_id').on(t.branchId),
  index('idx_branch_members_user_id').on(t.memberUserId),
]);

/** POS billing receipts created at a branch register */
export const billingReceipts = pgTable('billing_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull(), // Clerk Organization ID (denormalized for fast queries)
  cashierUserId: text('cashier_user_id').notNull(), // Clerk User ID of the cashier
  totalAmount: integer('total_amount').notNull(), // in cents
  paymentMethod: text('payment_method').default('cash').notNull(), // 'cash' | 'card' | 'other'
  customerName: text('customer_name'), // optional walk-in customer name
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_billing_receipts_branch_id').on(t.branchId),
  index('idx_billing_receipts_org_id').on(t.orgId),
  index('idx_billing_receipts_cashier').on(t.cashierUserId),
  index('idx_billing_receipts_created_at').on(t.createdAt),
]);

/** Line items for each billing receipt */
export const billingReceiptItems = pgTable('billing_receipt_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptId: uuid('receipt_id').notNull().references(() => billingReceipts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(), // Snapshot at time of billing
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(), // in cents, snapshot
}, (t) => [
  index('idx_billing_receipt_items_receipt_id').on(t.receiptId),
  index('idx_billing_receipt_items_product_id').on(t.productId),
]);

// ═══════════════════════════════════════════════════════════
// UNIVERSAL ENTERPRISE CATEGORIZATION & CATALOG SYSTEMS
// ═══════════════════════════════════════════════════════════

export const taxClasses = pgTable('tax_classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ratePercent: real('rate_percent').notNull(),
  code: text('code').unique().notNull(),
});

export const metadataTemplates = pgTable('metadata_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  fields: jsonb('fields').$type<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'date';
    required: boolean;
    unit?: string;
  }[]>().notNull(),
});

export const serviceConfigurations = pgTable('service_configurations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).unique().notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferMinutes: integer('buffer_minutes').default(0).notNull(),
  requiresResourceAllocation: boolean('requires_resource_allocation').default(false).notNull(),
});

export const inventoryBalances = pgTable('inventory_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  locationId: uuid('location_id').notNull(), // Links to branches table
  quantityOnHand: real('quantity_on_hand').default(0.0).notNull(),
  allocatedQuantity: real('allocated_quantity').default(0.0).notNull(),
  lowStockThreshold: real('low_stock_threshold').default(1.0).notNull(),
  binLocation: text('bin_location'),
}, (t) => [
  unique('unique_location_item').on(t.locationId, t.productId),
]);


