import { pgTable, text, timestamp, integer, uuid, index, boolean, unique } from 'drizzle-orm/pg-core';
import { products } from './catalog';
import { encryptedText } from './custom-types';

export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  address: encryptedText('address'),
  phone: encryptedText('phone'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_branches_org_id').on(t.orgId),
]);

export const branchInventory = pgTable('branch_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku'),
  quantity: integer('quantity').default(0).notNull(),
  binLocation: text('bin_location'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('branch_inventory_branch_product_unique').on(t.branchId, t.productId),
  index('idx_branch_inventory_branch_id').on(t.branchId),
  index('idx_branch_inventory_product_id').on(t.productId),
]);

export const branchMembers = pgTable('branch_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  memberUserId: text('member_user_id').notNull(),
  role: text('role').default('cashier').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('branch_members_branch_user_unique').on(t.branchId, t.memberUserId),
  index('idx_branch_members_branch_id').on(t.branchId),
  index('idx_branch_members_user_id').on(t.memberUserId),
]);

export const billingReceipts = pgTable('billing_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull(),
  cashierUserId: text('cashier_user_id').notNull(),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method').default('cash').notNull(),
  customerName: encryptedText('customer_name'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_billing_receipts_branch_id').on(t.branchId),
  index('idx_billing_receipts_org_id').on(t.orgId),
  index('idx_billing_receipts_cashier').on(t.cashierUserId),
  index('idx_billing_receipts_created_at').on(t.createdAt),
]);

export const billingReceiptItems = pgTable('billing_receipt_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptId: uuid('receipt_id').notNull().references(() => billingReceipts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
}, (t) => [
  index('idx_billing_receipt_items_receipt_id').on(t.receiptId),
  index('idx_billing_receipt_items_product_id').on(t.productId),
]);
