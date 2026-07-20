import { pgTable, text, timestamp, uuid, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { encryptedText } from './custom-types';

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
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
  name: encryptedText('name').notNull(),
  email: encryptedText('email').notNull(),
  emailHash: text('email_hash'),
  category: text('category').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_contact_submissions_status').on(t.status),
  index('idx_contact_submissions_email_hash').on(t.emailHash),
]);

export const processedWebhooks = pgTable('processed_webhooks', {
  id: text('id').primaryKey(),
  source: text('source').default('clerk').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_processed_webhooks_created_at').on(t.createdAt),
]);
