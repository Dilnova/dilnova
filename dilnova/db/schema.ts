import { pgTable, text, timestamp, integer, uuid, AnyPgColumn, unique, jsonb, index, boolean } from 'drizzle-orm/pg-core';

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
  media: jsonb('media').$type<{ url: string; type: 'image' | 'video' }[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_products_org_id').on(t.orgId),
  index('idx_products_category_id').on(t.categoryId),
  index('idx_products_created_at').on(t.createdAt),
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


