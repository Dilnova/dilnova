import { pgTable, text, timestamp, uuid, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { encryptedText } from "./custom-types";
import { products } from "./catalog";

export const metaCatalogIntegrations = pgTable(
  "meta_catalog_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").unique().notNull(),
    catalogId: text("catalog_id").notNull(),
    accessToken: encryptedText("access_token").notNull(),
    facebookPageId: text("facebook_page_id"),
    facebookPageAccessToken: encryptedText("facebook_page_access_token"),
    businessManagerId: text("business_manager_id"),
    instagramAccountId: text("instagram_account_id"),
    webhookUrl: text("webhook_url"),
    brandName: text("brand_name"),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    autoSyncOnCreate: boolean("auto_sync_on_create").default(true).notNull(),
    autoSyncOnUpdate: boolean("auto_sync_on_update").default(true).notNull(),
    autoSyncOnDelete: boolean("auto_sync_on_delete").default(true).notNull(),
    autoSyncMetaCatalog: boolean("auto_sync_meta_catalog").default(true).notNull(),
    autoPostFacebookFeed: boolean("auto_post_facebook_feed").default(true).notNull(),
    autoPostInstagramFeed: boolean("auto_post_instagram_feed").default(false).notNull(),
    autoTriggerWebhook: boolean("auto_trigger_webhook").default(false).notNull(),
    customPostTemplate: text("custom_post_template"),
    pinterestAccessToken: encryptedText("pinterest_access_token"),
    pinterestBoardId: text("pinterest_board_id"),
    pinterestBoardName: text("pinterest_board_name"),
    autoPostPinterest: boolean("auto_post_pinterest").default(false).notNull(),
    googleMerchantId: text("google_merchant_id"),
    googleFeedToken: text("google_feed_token"),
    autoSyncGoogle: boolean("auto_sync_google").default(true).notNull(),
    lastSyncAt: timestamp("last_sync_at"),
    syncStatus: text("sync_status").default("connected").notNull(),
    lastErrorMessage: text("last_error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_meta_catalog_integrations_org_id").on(t.orgId)],
);

export const metaCatalogSyncLogs = pgTable(
  "meta_catalog_sync_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    action: text("action").notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH_SYNC'
    status: text("status").notNull(), // 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PENDING'
    productName: text("product_name"),
    productSku: text("product_sku"),
    metaBatchHandle: text("meta_batch_handle"),
    metaResponse: jsonb("meta_response"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_meta_catalog_sync_logs_org_id").on(t.orgId),
    index("idx_meta_catalog_sync_logs_created_at").on(t.createdAt),
    index("idx_meta_catalog_sync_logs_product_id").on(t.productId),
  ],
);
