import { logger } from "@/shared/logging/logger";
import { InstagramFeedPostParams } from "../types";
import { META_GRAPH_API_VERSION, resolveProductFeedImageUrl } from "./facebook-feed";

/**
 * Automatically publishes a photo and caption to an Instagram Business account via Graph API.
 */
export async function postProductToInstagramFeed({
  igAccountId,
  accessToken,
  product,
  currency = "LKR",
  storeUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dilnova.com",
  brandName = "Dilnova Store",
}: InstagramFeedPostParams): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    const cleanIgId = igAccountId.trim().replace(/[^0-9]/g, "");
    const cleanToken = accessToken.trim();

    const finalImageUrl = resolveProductFeedImageUrl(product.imageUrl);
    if (!finalImageUrl) {
      return {
        success: false,
        error: "Product has no image or media uploaded. Skipping Instagram Feed post.",
      };
    }

    const cleanStoreUrl = storeUrl.replace(/\/+$/, "");
    const productLink = `${cleanStoreUrl}/products/${product.id}`;
    const priceFormatted = `${currency.toUpperCase()} ${(product.price / 100).toFixed(2)}`;

    const caption = [
      `🛍️ ${product.name}`,
      `💵 ${priceFormatted}`,
      product.description ? `\n${product.description.slice(0, 500)}` : "",
      `\n🔗 Shop online: ${productLink}`,
      `\n#${(brandName || "shop").toLowerCase().replace(/[^a-z0-9]/g, "")} #onlineshopping #ecommerce #newarrival`,
    ]
      .filter(Boolean)
      .join("\n");

    // Step 1: Create Media Container
    const containerUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanIgId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: finalImageUrl,
        caption,
        access_token: cleanToken,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || containerData.error) {
      logger.warn("Instagram container creation failed", {
        igAccountId,
        error: containerData.error,
      });
      return {
        success: false,
        error:
          containerData.error?.message || `Instagram container failed (${containerRes.status})`,
      };
    }

    const creationId = containerData.id;

    // Step 2: Publish the Media Container
    const publishUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanIgId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: cleanToken,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || publishData.error) {
      logger.warn("Instagram media_publish failed", { igAccountId, error: publishData.error });
      return {
        success: false,
        error: publishData.error?.message || `Instagram publish failed (${publishRes.status})`,
      };
    }

    return {
      success: true,
      mediaId: publishData.id,
    };
  } catch (error) {
    logger.error("Unexpected error in postProductToInstagramFeed", { igAccountId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish to Instagram Feed",
    };
  }
}

/**
 * Tests connection to an Instagram Business account.
 */
export async function testInstagramConnection({
  igAccountId,
  accessToken,
}: {
  igAccountId: string;
  accessToken: string;
}): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const cleanIgId = igAccountId.trim().replace(/[^0-9]/g, "");
    const cleanToken = accessToken.trim();

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanIgId}?fields=id,username,name&access_token=${encodeURIComponent(
      cleanToken,
    )}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      return {
        valid: false,
        error: data.error?.message || `Instagram API returned HTTP ${response.status}`,
      };
    }

    return {
      valid: true,
      username: data.username || data.name,
    };
  } catch (error) {
    logger.error("Instagram connection test failed", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Network error contacting Instagram",
    };
  }
}

/**
 * Automatically discovers the Instagram Business Account linked to a Facebook Page.
 */
export async function fetchLinkedInstagramAccount({
  facebookPageId,
  accessToken,
}: {
  facebookPageId: string;
  accessToken: string;
}): Promise<{
  success: boolean;
  account?: {
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
  };
  error?: string;
}> {
  try {
    const cleanPageId = facebookPageId.trim().replace(/[^0-9]/g, "");
    const cleanToken = accessToken.trim();
    if (!cleanPageId || !cleanToken) {
      return { success: false, error: "Facebook Page ID and Access Token are required." };
    }

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanPageId}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(
      cleanToken,
    )}`;

    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Failed to fetch linked Instagram account (${res.status})`,
      };
    }

    if (!data.instagram_business_account) {
      return {
        success: false,
        error:
          "No Instagram Professional/Business account is connected to this Facebook Page. Please link your Instagram account to your Facebook Page in Meta Business Suite first.",
      };
    }

    const ig = data.instagram_business_account;
    return {
      success: true,
      account: {
        id: ig.id,
        username: ig.username || ig.id,
        name: ig.name,
        profilePictureUrl: ig.profile_picture_url,
      },
    };
  } catch (err) {
    logger.error("Failed to fetch linked Instagram account", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to connect to Instagram",
    };
  }
}
