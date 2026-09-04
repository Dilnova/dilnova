import { logger } from "@/shared/logging/logger";
import { FacebookFeedPostParams } from "../types";

export const META_GRAPH_API_VERSION = "v21.0";

/**
 * Resolves a product's actual uploaded media URL to a valid JPEG photo.
 * Converts Cloudinary videos to JPEG snapshot posters, and returns null if no media was uploaded.
 */
export function resolveProductFeedImageUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) {
    return null;
  }
  const clean = url.trim();

  // Convert Cloudinary video URLs to first-frame JPEG image posters
  if (clean.includes("/video/upload/")) {
    return clean
      .replace(/\.(mov|mp4|webm|avi|mkv|3gp|flv|wmv)(\?.*)?$/i, ".jpg")
      .replace("/video/upload/", "/video/upload/so_0,f_jpg/");
  }

  // Handle standard video file extensions
  if (/\.(mov|mp4|webm|avi|mkv|3gp|flv|wmv)(\?.*)?$/i.test(clean)) {
    return clean.replace(/\.(mov|mp4|webm|avi|mkv|3gp|flv|wmv)/i, ".jpg");
  }

  return clean.startsWith("http") ? clean : `https://${clean}`;
}

/**
 * Automatically publishes a photo and promotional caption to a Facebook Page timeline.
 * Works globally without domain verification or catalog requirements.
 */
export async function postProductToFacebookPageFeed({
  pageId,
  pageAccessToken,
  product,
  currency = "LKR",
  storeUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dilnova.com",
  brandName = "Dilnova Store",
  customTemplate,
}: FacebookFeedPostParams): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const cleanPageId = pageId.trim().replace(/[^0-9]/g, "");
    const cleanToken = pageAccessToken.trim();
    const cleanStoreUrl = storeUrl.replace(/\/+$/, "");
    const productLink = `${cleanStoreUrl}/products/${product.id}`;
    const priceFormatted = `${currency.toUpperCase()} ${(product.price / 100).toFixed(2)}`;

    // Build standard caption or use custom template
    let message = "";
    if (customTemplate) {
      message = customTemplate
        .replace(/{title}/g, product.name)
        .replace(/{price}/g, priceFormatted)
        .replace(/{description}/g, product.description || "")
        .replace(/{link}/g, productLink)
        .replace(/{brand}/g, brandName || "Our Store");
    } else {
      message = [
        `🛍️ New Product: ${product.name}`,
        `💵 Price: ${priceFormatted}`,
        product.description ? `✨ ${product.description.slice(0, 300)}` : "",
        `🛒 Order online directly: ${productLink}`,
        `🏷️ Brand: ${brandName || "Dilnova"}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    // Only publish products that have their own uploaded media/image
    const rawUrl =
      product.imageUrl?.trim() ||
      (product.media && Array.isArray(product.media) && product.media.find((m) => m.url)?.url) ||
      null;
    const finalImageUrl = resolveProductFeedImageUrl(rawUrl);
    if (!finalImageUrl) {
      return {
        success: false,
        error: "Product has no image or media uploaded. Skipping Facebook Feed post.",
      };
    }

    const photoUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanPageId}/photos`;
    let response = await fetch(photoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: finalImageUrl,
        caption: message,
        published: true, // Guarantees post appears on the public Page timeline feed
        access_token: cleanToken,
      }),
    });

    let data = await response.json();

    // Self-healing: If User/System Token caused #200 publish_actions, try resolving Page Access Token & retry
    if (
      data.error &&
      (data.error.code === 200 || data.error.message?.includes("publish_actions"))
    ) {
      try {
        const pageRes = await fetch(
          `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanPageId}?fields=access_token&access_token=${encodeURIComponent(
            cleanToken,
          )}`,
        );
        if (pageRes.ok) {
          const pageData = await pageRes.json();
          if (pageData.access_token) {
            response = await fetch(photoUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: finalImageUrl,
                caption: message,
                published: true,
                access_token: pageData.access_token,
              }),
            });
            data = await response.json();
          }
        }
      } catch {
        // Ignore and fallback to reporting initial error
      }
    }

    if (!response.ok || data.error) {
      logger.warn("Facebook Page Photo Post failed", { pageId, error: data.error });
      return {
        success: false,
        error: data.error?.message || `Facebook API HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      postId: data.post_id || data.id,
    };
  } catch (error) {
    logger.error("Unexpected error in postProductToFacebookPageFeed", { pageId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish post to Facebook Page",
    };
  }
}

export interface FacebookPageItem {
  id: string;
  name: string;
  link?: string;
  pictureUrl?: string;
  accessToken?: string;
}

/**
 * Automatically discovers all Facebook Pages managed by the provided Access Token.
 * Enables 1-Click Page Selection without manual ID lookup.
 */
export async function fetchFacebookManagedPages({
  accessToken,
  pageIdHint,
}: {
  accessToken: string;
  pageIdHint?: string;
}): Promise<{ success: boolean; pages: FacebookPageItem[]; error?: string }> {
  try {
    const cleanToken = accessToken.trim();
    if (!cleanToken) {
      return { success: false, pages: [], error: "Access token is required" };
    }

    const pagesMap = new Map<string, FacebookPageItem>();

    // 1. Try /me/accounts (Personal User & Page Tokens)
    try {
      const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/accounts?fields=id,name,link,picture{url},access_token,tasks&limit=100&access_token=${encodeURIComponent(
        cleanToken,
      )}`;
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (res.ok && data.data && Array.isArray(data.data)) {
        for (const p of data.data) {
          if (p.id) {
            pagesMap.set(p.id, {
              id: p.id,
              name: p.name || `Page ${p.id}`,
              link: p.link || `https://facebook.com/${p.id}`,
              pictureUrl: p.picture?.data?.url,
              accessToken: p.access_token,
            });
          }
        }
      }
    } catch {}

    // 2. Try /me/assigned_pages (Business System User tokens)
    try {
      const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/assigned_pages?fields=id,name,link,picture{url},access_token&limit=100&access_token=${encodeURIComponent(
        cleanToken,
      )}`;
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (res.ok && data.data && Array.isArray(data.data)) {
        for (const p of data.data) {
          if (p.id) {
            pagesMap.set(p.id, {
              id: p.id,
              name: p.name || `Page ${p.id}`,
              link: p.link || `https://facebook.com/${p.id}`,
              pictureUrl: p.picture?.data?.url,
              accessToken: p.access_token,
            });
          }
        }
      }
    } catch {}

    // 3. Try /me/businesses (Business Portfolios & Owned Pages)
    try {
      const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/businesses?fields=id,name,owned_pages{id,name,link,picture{url},access_token},client_pages{id,name,link,picture{url},access_token}&access_token=${encodeURIComponent(
        cleanToken,
      )}`;
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (res.ok && data.data && Array.isArray(data.data)) {
        for (const b of data.data) {
          const bizPages = [...(b.owned_pages?.data || []), ...(b.client_pages?.data || [])];
          for (const p of bizPages) {
            if (p.id) {
              pagesMap.set(p.id, {
                id: p.id,
                name: p.name || `Page ${p.id}`,
                link: p.link || `https://facebook.com/${p.id}`,
                pictureUrl: p.picture?.data?.url,
                accessToken: p.access_token,
              });
            }
          }
        }
      }
    } catch {}

    // 4. Try known / hinted Page IDs (e.g. 1366821166509556 or pageIdHint)
    const knownPageIds = [pageIdHint, "1366821166509556"].filter(Boolean) as string[];
    for (const pid of knownPageIds) {
      const cleanPid = pid.trim().replace(/[^0-9]/g, "");
      if (cleanPid && !pagesMap.has(cleanPid)) {
        try {
          const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanPid}?fields=id,name,link,picture{url},access_token&access_token=${encodeURIComponent(
            cleanToken,
          )}`;
          const res = await fetch(url, { method: "GET" });
          const data = await res.json();
          if (res.ok && data.id && data.name) {
            pagesMap.set(data.id, {
              id: data.id,
              name: data.name,
              link: data.link || `https://facebook.com/${data.id}`,
              pictureUrl: data.picture?.data?.url,
              accessToken: data.access_token,
            });
          }
        } catch {}
      }
    }

    const pages = Array.from(pagesMap.values());
    return {
      success: true,
      pages,
    };
  } catch (error) {
    logger.error("Failed to fetch managed Facebook Pages", error);
    return {
      success: false,
      pages: [],
      error: error instanceof Error ? error.message : "Failed to connect to Facebook",
    };
  }
}

/**
 * Tests connection to a Facebook Page using the provided Page Access Token.
 */
export async function testFacebookPageConnection({
  pageId,
  pageAccessToken,
}: {
  pageId: string;
  pageAccessToken: string;
}): Promise<{
  valid: boolean;
  pageName?: string;
  pageLink?: string;
  pictureUrl?: string;
  error?: string;
}> {
  try {
    const cleanPageId = pageId.trim().replace(/[^0-9]/g, "");
    const cleanToken = pageAccessToken.trim();

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanPageId}?fields=id,name,link,picture{url}&access_token=${encodeURIComponent(
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
        error: formatMetaErrorMessage(
          data.error?.message || `Facebook returned HTTP ${response.status}`,
        ),
      };
    }

    return {
      valid: true,
      pageName: data.name,
      pageLink: data.link || `https://facebook.com/${cleanPageId}`,
      pictureUrl: data.picture?.data?.url,
    };
  } catch (error) {
    logger.error("Facebook Page connection test failed", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Network error contacting Facebook",
    };
  }
}

/**
 * Standardizes Meta API error messages into actionable, user-friendly guidance.
 */
export function formatMetaErrorMessage(errorMsg?: string): string {
  if (!errorMsg) return "Meta API request failed.";
  if (
    errorMsg.includes("Session has expired") ||
    errorMsg.includes("Error validating access token") ||
    errorMsg.includes("The access token could not be decrypted") ||
    errorMsg.includes("Malformed access token")
  ) {
    return "🔑 Your Meta Access Token has expired. Please open Meta Graph API Explorer to generate a fresh token (or use a permanent System User token) and paste it into Step 1.";
  }
  return errorMsg;
}
