import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').default('product').notNull(), // 'product' | 'service'
  description: text('description'),
  price: integer('price').notNull(), // price in cents (e.g. 999 for $9.99)
  imageUrl: text('image_url'),
  orgId: text('org_id').notNull(), // Links to Clerk Organization ID
  categoryId: uuid('category_id').references(() => categories.id), // Links to category
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
