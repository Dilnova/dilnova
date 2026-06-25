import { pgTable, text, timestamp, integer, uuid, index, boolean, customType } from 'drizzle-orm/pg-core';
import { products } from './catalog';
import { encryptedText } from './custom-types';

export const simulatedOrders = pgTable('simulated_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerName: encryptedText('customer_name').notNull(),
  customerEmail: encryptedText('customer_email').notNull(),
  customerEmailHash: text('customer_email_hash'),
  customerUserId: text('customer_user_id'),
  subtotalAmount: integer('subtotal_amount').default(0).notNull(),
  taxAmount: integer('tax_amount').default(0).notNull(),
  shippingAmount: integer('shipping_amount').default(0).notNull(),
  totalAmount: integer('total_amount').notNull(),
  status: text('status').default('pending').notNull(),
  fulfillmentMethod: text('fulfillment_method').default('standard_delivery').notNull(),
  paymentMethod: text('payment_method').default('bank_transfer').notNull(),
  pickupBranchId: uuid('pickup_branch_id'),
  stockDepleted: boolean('stock_depleted').default(false).notNull(),
  paymentSlipUrl: text('payment_slip_url'),
  paymentSlipUploadedAt: timestamp('payment_slip_uploaded_at'),
  paymentVerifiedAt: timestamp('payment_verified_at'),
  paymentVerifiedBy: text('payment_verified_by'),
  shippingAddress: encryptedText('shipping_address'),
  shippingPhone: encryptedText('shipping_phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_simulated_orders_status').on(t.status),
  index('idx_simulated_orders_created_at').on(t.createdAt),
  index('idx_simulated_orders_customer_user_id').on(t.customerUserId),
  index('idx_simulated_orders_email_hash').on(t.customerEmailHash),
]);

export const customerCarts = pgTable('customer_carts', {
  userId: text('user_id').primaryKey(),
  itemsJson: text('items_json').notNull().default('[]'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const simulatedOrderItems = pgTable('simulated_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => simulatedOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(),
  vendorOrgId: text('vendor_org_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
}, (t) => [
  index('idx_simulated_order_items_order_id').on(t.orderId),
  index('idx_simulated_order_items_product_id').on(t.productId),
]);
