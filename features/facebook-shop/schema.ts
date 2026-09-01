import { z } from "zod/v3";

export const saveFacebookShopSettingsSchema = z.object({
  catalogId: z
    .string()
    .trim()
    .min(1, "Meta Catalog ID is required.")
    .max(100, "Catalog ID cannot exceed 100 characters."),
  accessToken: z
    .string()
    .trim()
    .min(1, "Meta Access Token is required.")
    .max(1000, "Access Token cannot exceed 1000 characters."),
  brandName: z
    .string()
    .trim()
    .max(100, "Brand name cannot exceed 100 characters.")
    .optional()
    .nullable(),
  facebookPageId: z.string().trim().max(100).optional().nullable(),
  businessManagerId: z.string().trim().max(100).optional().nullable(),
  isEnabled: z.boolean().default(true),
  autoSyncOnCreate: z.boolean().default(true),
  autoSyncOnUpdate: z.boolean().default(true),
  autoSyncOnDelete: z.boolean().default(true),
});

export const testFacebookShopConnectionSchema = z.object({
  catalogId: z.string().trim().min(1, "Meta Catalog ID is required."),
  accessToken: z.string().trim().min(1, "Meta Access Token is required."),
});

export const triggerBatchSyncSchema = z.object({
  forceAll: z.boolean().optional().default(false),
});

export const getFacebookSyncLogsSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
});
