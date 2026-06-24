import { pgTable, text, timestamp, integer, uuid, index, real, unique } from 'drizzle-orm/pg-core';
import { products } from './catalog';
import { encryptedText } from './custom-types';

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  contactName: encryptedText('contact_name'),
  email: encryptedText('email'),
  phone: encryptedText('phone'),
  address: encryptedText('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_suppliers_org_id').on(t.orgId),
]);

export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }).unique(),
  sku: text('sku'),
  quantity: integer('quantity').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
  binLocation: text('bin_location'),
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
  type: text('type').notNull(),
  quantityChanged: integer('quantity_changed').notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  reason: text('reason'),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_inventory_movements_inventory_id').on(t.inventoryId),
  index('idx_inventory_movements_type').on(t.type),
  index('idx_inventory_movements_created_at').on(t.createdAt),
]);

export const inventoryBalances = pgTable('inventory_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  locationId: uuid('location_id').notNull(),
  quantityOnHand: real('quantity_on_hand').default(0.0).notNull(),
  allocatedQuantity: real('allocated_quantity').default(0.0).notNull(),
  lowStockThreshold: real('low_stock_threshold').default(1.0).notNull(),
  binLocation: text('bin_location'),
}, (t) => [
  unique('unique_location_item').on(t.locationId, t.productId),
]);
