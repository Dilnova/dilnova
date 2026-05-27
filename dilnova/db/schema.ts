import { pgTable, text, timestamp, integer, uuid, AnyPgColumn, unique } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'cascade' }),
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
  views: integer('views').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Clerk User ID
  userName: text('user_name').notNull(), // User Display Name
  userImageUrl: text('user_image_url'), // User Profile Photo
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wishlists = pgTable('wishlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk User ID
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('wishlist_user_product_unique').on(t.userId, t.productId)
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
});

