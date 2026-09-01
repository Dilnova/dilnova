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
}

export interface InstagramFeedPostParams {
  igAccountId: string;
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
  facebookFeed?: { success: boolean; postId?: string; error?: string };
  instagramFeed?: { success: boolean; mediaId?: string; error?: string };
  metaCatalog?: { success: boolean; error?: string };
  webhook?: { success: boolean; status?: number; error?: string };
}
