import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock DB
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

vi.mock("@/shared/db/client", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

// Mock Currency service
const mockGetOrgCurrencySettings = vi.fn();
vi.mock("@/shared/currency/exchange-rates.service", () => ({
  getOrgCurrencySettings: (...args: unknown[]) => mockGetOrgCurrencySettings(...args),
}));

// Mock Channel Services
const mockPostProductToFacebookPageFeed = vi.fn();
vi.mock("@/features/social-share/services/facebook-feed", () => ({
  postProductToFacebookPageFeed: (...args: unknown[]) => mockPostProductToFacebookPageFeed(...args),
}));

const mockPostProductToInstagramFeed = vi.fn();
vi.mock("@/features/social-share/services/instagram-feed", () => ({
  postProductToInstagramFeed: (...args: unknown[]) => mockPostProductToInstagramFeed(...args),
}));

const mockCreatePinterestProductPin = vi.fn();
vi.mock("@/features/social-share/services/pinterest", () => ({
  createPinterestProductPin: (...args: unknown[]) => mockCreatePinterestProductPin(...args),
}));

const mockDispatchProductWebhook = vi.fn();
vi.mock("@/features/social-share/services/webhook-dispatcher", () => ({
  dispatchProductWebhook: (...args: unknown[]) => mockDispatchProductWebhook(...args),
}));

const mockFormatDilnovaProductForMeta = vi.fn();
const mockSendMetaItemsBatch = vi.fn();
vi.mock("@/features/facebook-shop/services/meta-api", () => ({
  formatDilnovaProductForMeta: (...args: unknown[]) => mockFormatDilnovaProductForMeta(...args),
  sendMetaItemsBatch: (...args: unknown[]) => mockSendMetaItemsBatch(...args),
}));

// Mock Logger
vi.mock("@/shared/logging/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { dispatchProductSocialPublishing } from "@/features/social-share/dispatcher";

describe("features/social-share/dispatcher", () => {
  const defaultIntegration = {
    id: "integ_123",
    orgId: "org_test",
    isEnabled: true,
    autoSyncOnCreate: true,
    autoSyncOnUpdate: true,
    autoSyncOnDelete: true,
    facebookPageId: "fb_page_100",
    facebookPageAccessToken: "fb_page_token",
    autoPostFacebookFeed: true,
    instagramAccountId: "ig_acc_200",
    autoPostInstagramFeed: true,
    catalogId: "cat_300",
    accessToken: "meta_access_token",
    autoSyncMetaCatalog: true,
    webhookUrl: "https://api.example.com/webhook",
    autoTriggerWebhook: true,
    pinterestBoardId: "pin_board_500",
    pinterestAccessToken: "pin_token_secret",
    autoPostPinterest: true,
    brandName: "Artisan Woodworks",
    customPostTemplate: null,
  };

  const defaultProduct = {
    id: "prod_table_1",
    orgId: "org_test",
    name: "Teak Dining Table",
    description: "Solid reclaimed teak handcrafted dining table",
    price: 85000,
    type: "product",
    sku: "WD-TAB-01",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/table.jpg",
    media: [{ url: "https://res.cloudinary.com/demo/image/upload/table.jpg", type: "image" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });

    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue({});

    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue({}) });

    mockGetOrgCurrencySettings.mockResolvedValue({ baseCurrency: "LKR" });
    mockPostProductToFacebookPageFeed.mockResolvedValue({ success: true, postId: "fb_post_1" });
    mockPostProductToInstagramFeed.mockResolvedValue({ success: true, mediaId: "ig_post_1" });
    mockFormatDilnovaProductForMeta.mockReturnValue({
      id: "prod_table_1",
      title: "Teak Dining Table",
    });
    mockSendMetaItemsBatch.mockResolvedValue({ handles: ["handle_batch_1"] });
    mockDispatchProductWebhook.mockResolvedValue({ success: true, statusCode: 200 });
    mockCreatePinterestProductPin.mockResolvedValue({ success: true, pinId: "pin_777" });
  });

  it("returns empty result if integration row does not exist", async () => {
    mockLimit.mockResolvedValueOnce([]); // no integration

    const result = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "CREATE",
    });

    expect(result).toEqual({});
    expect(mockPostProductToFacebookPageFeed).not.toHaveBeenCalled();
  });

  it("returns empty result if integration is disabled (isEnabled = false)", async () => {
    mockLimit.mockResolvedValueOnce([{ ...defaultIntegration, isEnabled: false }]);

    const result = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "CREATE",
    });

    expect(result).toEqual({});
    expect(mockPostProductToFacebookPageFeed).not.toHaveBeenCalled();
  });

  it("skips publishing when action sync toggle is disabled", async () => {
    // 1. autoSyncOnCreate is false
    mockLimit.mockResolvedValueOnce([{ ...defaultIntegration, autoSyncOnCreate: false }]);
    const resCreate = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "CREATE",
    });
    expect(resCreate).toEqual({});

    // 2. autoSyncOnUpdate is false
    mockLimit.mockResolvedValueOnce([{ ...defaultIntegration, autoSyncOnUpdate: false }]);
    const resUpdate = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "UPDATE",
    });
    expect(resUpdate).toEqual({});

    // 3. autoSyncOnDelete is false
    mockLimit.mockResolvedValueOnce([{ ...defaultIntegration, autoSyncOnDelete: false }]);
    const resDelete = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "DELETE",
    });
    expect(resDelete).toEqual({});
  });

  it("returns empty result if product is not found in database for CREATE action", async () => {
    mockLimit
      .mockResolvedValueOnce([defaultIntegration]) // 1. integration
      .mockResolvedValueOnce([]); // 2. product lookup returns empty

    const result = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_nonexistent",
      action: "CREATE",
    });

    expect(result).toEqual({});
    expect(mockPostProductToFacebookPageFeed).not.toHaveBeenCalled();
  });

  it("dispatches to all configured channels concurrently on CREATE with media", async () => {
    mockLimit
      .mockResolvedValueOnce([defaultIntegration]) // 1. integration
      .mockResolvedValueOnce([defaultProduct]) // 2. product
      .mockResolvedValueOnce([{ quantity: 15 }]) // 3. inventory
      .mockResolvedValueOnce([]) // 4. check existing fb log -> none
      .mockResolvedValueOnce([]) // 5. check existing ig log -> none
      .mockResolvedValueOnce([]); // 6. check existing pinterest log -> none

    const results = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "CREATE",
    });

    // Check Facebook Page Feed
    expect(mockPostProductToFacebookPageFeed).toHaveBeenCalledWith({
      pageId: "fb_page_100",
      pageAccessToken: "fb_page_token",
      product: defaultProduct,
      currency: "LKR",
      brandName: "Artisan Woodworks",
      customTemplate: null,
      userToken: "meta_access_token",
    });

    expect(results.facebookFeed).toEqual({ success: true, postId: "fb_post_1" });

    // Check Instagram Feed
    expect(mockPostProductToInstagramFeed).toHaveBeenCalledWith({
      igAccountId: "ig_acc_200",
      accessToken: "fb_page_token",
      product: defaultProduct,
      currency: "LKR",
      brandName: "Artisan Woodworks",
    });
    expect(results.instagramFeed).toEqual({ success: true, mediaId: "ig_post_1" });

    // Check Meta Catalog Sync
    expect(mockFormatDilnovaProductForMeta).toHaveBeenCalledWith({
      product: defaultProduct,
      quantity: 15,
      currency: "LKR",
      brandName: "Artisan Woodworks",
    });
    expect(mockSendMetaItemsBatch).toHaveBeenCalledWith({
      catalogId: "cat_300",
      accessToken: "meta_access_token",
      payload: {
        item_type: "PRODUCT_ITEM",
        requests: [
          {
            method: "UPDATE",
            data: { id: "prod_table_1", title: "Teak Dining Table" },
          },
        ],
      },
    });
    expect(results.metaCatalog).toEqual({ success: true, error: undefined });

    // Check Webhook
    expect(mockDispatchProductWebhook).toHaveBeenCalledWith({
      webhookUrl: "https://api.example.com/webhook",
      event: "product.created",
      orgId: "org_test",
      product: defaultProduct,
    });
    expect(results.webhook).toEqual({ success: true, statusCode: 200 });

    // Check Pinterest Pin
    expect(mockCreatePinterestProductPin).toHaveBeenCalledWith({
      boardId: "pin_board_500",
      accessToken: "pin_token_secret",
      product: defaultProduct,
      currency: "LKR",
      brandName: "Artisan Woodworks",
    });
    expect(results.pinterestPin).toEqual({ success: true, pinId: "pin_777" });

    // Check database update for lastSyncAt
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("prevents duplicate posts on Facebook, Instagram, and Pinterest if already successfully logged", async () => {
    mockLimit
      .mockResolvedValueOnce([defaultIntegration]) // 1. integration
      .mockResolvedValueOnce([defaultProduct]) // 2. product
      .mockResolvedValueOnce([{ quantity: 5 }]) // 3. inventory
      .mockResolvedValueOnce([{ id: "existing_fb_log_1" }]) // 4. fb log exists!
      .mockResolvedValueOnce([{ id: "existing_ig_log_1" }]) // 5. ig log exists!
      .mockResolvedValueOnce([{ id: "existing_pin_log_1" }]); // 6. pin log exists!

    const results = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "CREATE",
    });

    expect(mockPostProductToFacebookPageFeed).not.toHaveBeenCalled();
    expect(mockPostProductToInstagramFeed).not.toHaveBeenCalled();
    expect(mockCreatePinterestProductPin).not.toHaveBeenCalled();

    // Meta catalog and Webhook still execute on CREATE/UPDATE
    expect(mockSendMetaItemsBatch).toHaveBeenCalled();
    expect(mockDispatchProductWebhook).toHaveBeenCalled();
    expect(results.facebookFeed).toBeUndefined();
    expect(results.instagramFeed).toBeUndefined();
    expect(results.pinterestPin).toBeUndefined();
  });

  it("sends DELETE batch request to Meta Catalog and triggers webhook on DELETE action", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        ...defaultIntegration,
        autoPostFacebookFeed: false, // disable FB delete graph calls for this test
      },
    ]);

    const results = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "DELETE",
    });

    // Check Meta Catalog delete batch
    expect(mockSendMetaItemsBatch).toHaveBeenCalledWith({
      catalogId: "cat_300",
      accessToken: "meta_access_token",
      payload: {
        item_type: "PRODUCT_ITEM",
        requests: [{ method: "DELETE", retailer_id: "prod_table_1" }],
      },
    });

    // Check Webhook event
    expect(mockDispatchProductWebhook).toHaveBeenCalledWith({
      webhookUrl: "https://api.example.com/webhook",
      event: "product.deleted",
      orgId: "org_test",
      product: { id: "prod_table_1" },
    });

    expect(results.metaCatalog).toEqual({ success: true, error: undefined });
    expect(results.webhook).toEqual({ success: true, statusCode: 200 });
  });

  it("handles errors in individual channels without stopping other channels from executing", async () => {
    mockLimit
      .mockResolvedValueOnce([defaultIntegration])
      .mockResolvedValueOnce([defaultProduct])
      .mockResolvedValueOnce([{ quantity: 2 }])
      .mockResolvedValueOnce([]) // no fb log
      .mockResolvedValueOnce([]) // no ig log
      .mockResolvedValueOnce([]); // no pin log

    // Facebook throws an exception
    mockPostProductToFacebookPageFeed.mockRejectedValueOnce(new Error("Facebook Graph API down"));

    // Meta Catalog returns API error
    mockSendMetaItemsBatch.mockResolvedValueOnce({
      error: { message: "Invalid catalog credentials" },
    });

    const results = await dispatchProductSocialPublishing({
      orgId: "org_test",
      productId: "prod_table_1",
      action: "CREATE",
    });

    // Facebook error recorded in result
    expect(results.facebookFeed).toEqual({
      success: false,
      error: "Facebook Graph API down",
    });

    // Meta error recorded in result
    expect(results.metaCatalog).toEqual({
      success: false,
      error: "Invalid catalog credentials",
    });

    // Instagram, Webhook, and Pinterest still succeeded despite Facebook/Meta failures
    expect(results.instagramFeed).toEqual({ success: true, mediaId: "ig_post_1" });
    expect(results.webhook).toEqual({ success: true, statusCode: 200 });
    expect(results.pinterestPin).toEqual({ success: true, pinId: "pin_777" });
  });
});
