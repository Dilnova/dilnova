export interface SocialProductPayload {
  id: string;
  name: string;
  description?: string | null;
  price: number; // in cents
  currency?: string | null;
  imageUrl?: string | null;
  media?: Array<{ url: string; type: "image" | "video" }> | null;
  sku?: string | null;
  status?: string | null;
  isPreorder?: boolean | null;
}

export interface FacebookFeedPostParams {
  pageId: string;
  pageAccessToken: string;
  product: SocialProductPayload;
  currency?: string;
  storeUrl?: string;
  brandName?: string | null;
  customTemplate?: string | null;
  userToken?: string | null;
}

export interface InstagramFeedPostParams {
  igAccountId: string;
  accessToken: string;
  product: SocialProductPayload;
  currency?: string;
  storeUrl?: string;
  brandName?: string | null;
  userToken?: string | null;
}

export interface PinterestPinParams {
  boardId: string;
  accessToken: string;
  product: SocialProductPayload;
  currency?: string;
  storeUrl?: string;
  brandName?: string | null;
}

export interface WebhookPayload {
  event: "product.created" | "product.updated" | "product.deleted" | "ping";
  orgId: string;
  product?: SocialProductPayload | { id: string };
  timestamp: string;
}

export interface SocialShareLinks {
  whatsappUrl: string;
  facebookShareUrl: string;
  telegramShareUrl: string;
  twitterShareUrl: string;
  instagramCaption: string;
  productUrl: string;
  formattedPrice: string;
}

export interface MultiChannelPublishResult {
  facebookFeed?: { success: boolean; postId?: string; error?: string; refreshedToken?: string };
  instagramFeed?: { success: boolean; mediaId?: string; error?: string; refreshedToken?: string };
  metaCatalog?: { success: boolean; error?: string };
  pinterestPin?: { success: boolean; pinId?: string; error?: string };
  webhook?: { success: boolean; status?: number; error?: string };
}

export type TokenHealthStatus =
  | "HEALTHY"
  | "EXPIRING_SOON" // <= 7 days until expiration
  | "EXPIRED"
  | "INVALID"
  | "UNCONFIGURED";

export interface ChannelTokenHealth {
  channel: "facebook_page" | "meta_catalog" | "instagram" | "pinterest";
  status: TokenHealthStatus;
  isConfigured: boolean;
  isValid: boolean;
  isPermanent: boolean;
  expiresAt: string | null; // ISO string or null
  expiresInDays: number | null; // null if permanent/unconfigured
  scopes: string[];
  accountName?: string;
  accountId?: string;
  errorMessage?: string;
  canRefresh: boolean;
  lastCheckedAt: string;
}

export interface SocialTokensHealthReport {
  overallStatus: "HEALTHY" | "WARNING" | "CRITICAL" | "UNCONFIGURED";
  checkedAt: string;
  facebookPage: ChannelTokenHealth;
  metaCatalog: ChannelTokenHealth;
  instagram: ChannelTokenHealth;
  pinterest: ChannelTokenHealth;
  actionsNeeded: string[];
  canAutoRefresh: boolean;
}
