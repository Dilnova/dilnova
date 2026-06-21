import { pgTable, text, timestamp, integer, uuid, AnyPgColumn, unique, jsonb, index, boolean, real } from 'drizzle-orm/pg-core';

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
  type: text('type').default('product').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  imageUrl: text('image_url'),
  orgId: text('org_id').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  views: integer('views').default(0).notNull(),
  media: jsonb('media').$type<{ url: string; type: 'image' | 'video' }[]>().default([]).notNull(),
  sku: text('sku'),
  barcodes: jsonb('barcodes').$type<string[]>().default([]).notNull(),
  status: text('status').default('active').notNull(),
  attributes: jsonb('attributes').$type<Record<string, unknown>>().default({}).notNull(),
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
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userImageUrl: text('user_image_url'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_reviews_product_id').on(t.productId),
  index('idx_reviews_user_id').on(t.userId),
]);

export const wishlists = pgTable('wishlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('wishlist_user_product_unique').on(t.userId, t.productId),
  index('idx_wishlists_user_id').on(t.userId),
]);

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userImageUrl: text('user_image_url'),
  content: text('content').notNull(),
  answer: text('answer'),
  answeredBy: text('answered_by'),
  answeredAt: timestamp('answered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_questions_product_id').on(t.productId),
]);

export const serviceConfigurations = pgTable('service_configurations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).unique().notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferMinutes: integer('buffer_minutes').default(0).notNull(),
  requiresResourceAllocation: boolean('requires_resource_allocation').default(false).notNull(),
});
