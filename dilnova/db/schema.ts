import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // price in cents (e.g. 999 for $9.99)
  imageUrl: text('image_url'),
  orgId: text('org_id').notNull(), // Links to Clerk Organization ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
