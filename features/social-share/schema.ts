import { z } from "zod/v3";

export const saveSocialSettingsSchema = z.object({
  catalogId: z.string().trim().max(100).optional().nullable(),
  accessToken: z.string().trim().max(1000).optional().nullable(),
  facebookPageId: z.string().trim().max(100).optional().nullable(),
  facebookPageAccessToken: z.string().trim().max(1000).optional().nullable(),
  instagramAccountId: z.string().trim().max(100).optional().nullable(),
  webhookUrl: z
    .string()
    .trim()
    .url("Must be a valid URL starting with http:// or https://")
    .optional()
    .nullable()
    .or(z.literal("")),
  brandName: z.string().trim().max(100).optional().nullable(),
  isEnabled: z.boolean().default(true),
  autoPostFacebookFeed: z.boolean().default(true),
  autoPostInstagramFeed: z.boolean().default(false),
  autoSyncMetaCatalog: z.boolean().default(true),
  autoTriggerWebhook: z.boolean().default(false),
  customPostTemplate: z.string().max(1000).optional().nullable(),
});

export const testFacebookPagePostSchema = z.object({
  facebookPageId: z.string().trim().min(1, "Facebook Page ID is required."),
  facebookPageAccessToken: z.string().trim().min(1, "Facebook Page Access Token is required."),
});

export const testInstagramPostSchema = z.object({
  instagramAccountId: z.string().trim().min(1, "Instagram Account ID is required."),
  accessToken: z.string().trim().min(1, "Access Token is required."),
});

export const testWebhookSchema = z.object({
  webhookUrl: z.string().trim().url("Must be a valid HTTP or HTTPS URL."),
});

export const manualPublishProductSchema = z.object({
  productId: z.string().uuid("Invalid product ID."),
  channels: z.array(z.enum(["facebook_feed", "instagram_feed", "meta_catalog", "webhook"])).min(1),
});

export const discoverFacebookPagesSchema = z.object({
  accessToken: z.string().trim().min(1, "Access Token is required to discover pages."),
  pageIdHint: z.string().trim().optional(),
});

export const discoverInstagramAccountSchema = z.object({
  facebookPageId: z.string().trim().min(1, "Facebook Page ID is required."),
  accessToken: z.string().trim().min(1, "Access Token is required."),
});
