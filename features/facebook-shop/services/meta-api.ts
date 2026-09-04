import { logger } from "@/shared/logging/logger";
import {
  MetaProductItem,
  MetaBatchPayload,
  MetaBatchResponse,
  MetaBatchStatusResponse,
  MetaCatalogVerificationResult,
} from "../types";

export const META_GRAPH_API_VERSION = "v21.0";
export const META_BATCH_MAX_SIZE = 3000;

interface FormatProductParams {
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: number; // in cents
    imageUrl?: string | null;
    media?: Array<{ url: string; type: "image" | "video" }> | null;
    isPreorder?: boolean | null;
    status?: string | null;
  };
  quantity?: number;
  currency?: string;
  storeBaseUrl?: string;
  brandName?: string | null;
}

export const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";

/**
 * Resolves a valid HTTPS image link for Meta.
 * Converts Cloudinary videos to JPEG image posters and provides fallbacks for items without photos.
 */
export function resolveMetaImageUrl(url: string | null | undefined): string {
  if (!url || !url.trim()) {
    return DEFAULT_FALLBACK_IMAGE;
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
 * Formats a Dilnova product into Meta's strict catalog product specification.
 */
export function formatDilnovaProductForMeta({
  product,
  quantity = 1,
  currency = "LKR",
  storeBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dilnova.com",
  brandName = "Dilnova Store",
}: FormatProductParams): MetaProductItem {
  // Resolve availability status per Meta specification
  let availability: MetaProductItem["availability"] = "in stock";
  if (product.isPreorder) {
    availability = "preorder";
  } else if (product.status === "out_of_stock" || quantity <= 0) {
    availability = "out of stock";
  }

  // Price formatting: Meta requires single string with decimal price and ISO currency code (e.g. "45.00 USD")
  const priceInUnits = (product.price / 100).toFixed(2);
  const formattedPrice = `${priceInUnits} ${currency.toUpperCase()}`;

  // Image link with video poster & fallback resolution
  const imageLink = resolveMetaImageUrl(product.imageUrl);

  // Extract extra image CDN URLs from media array
  const extraImages: string[] = [];
  if (Array.isArray(product.media)) {
    for (const item of product.media) {
      if (item.url && extraImages.length < 20) {
        const resolved = resolveMetaImageUrl(item.url);
        if (resolved !== imageLink && !extraImages.includes(resolved)) {
          extraImages.push(resolved);
        }
      }
    }
  }

  // Guaranteed absolute HTTPS store URL
  const validBaseUrl =
    storeBaseUrl && storeBaseUrl.startsWith("http")
      ? storeBaseUrl.replace(/\/+$/, "")
      : "https://dilnova.com";
  const productLink = `${validBaseUrl}/products/${product.id}`;

  return {
    id: product.id,
    title: product.name.slice(0, 200),
    description: product.description ? product.description.slice(0, 9999) : product.name,
    availability,
    condition: "new",
    price: formattedPrice,
    link: productLink,
    image_link: imageLink,
    brand: (brandName || "Dilnova Store").slice(0, 100),
    additional_image_cdn_urls: extraImages.length > 0 ? extraImages : undefined,
  };
}

/**
 * Utility to chunk large arrays into chunks smaller than Meta's batch limit.
 */
export function chunkArray<T>(items: T[], size: number = META_BATCH_MAX_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Verifies catalog existence and permissions using lightweight metadata check.
 */
export async function testCatalogConnection({
  catalogId,
  accessToken,
}: {
  catalogId: string;
  accessToken: string;
}): Promise<MetaCatalogVerificationResult> {
  const cleanCatalogId = catalogId.trim().replace(/[^0-9]/g, "");
  const cleanAccessToken = accessToken.trim();

  if (!cleanCatalogId) {
    return {
      valid: false,
      error: "Catalog ID must be a numeric ID (e.g. 2366911393556417).",
    };
  }

  try {
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(
      cleanCatalogId,
    )}?fields=id,name,vertical&access_token=${encodeURIComponent(cleanAccessToken)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const rawMsg = data.error?.message || `Meta API returned HTTP ${response.status}`;
      if (rawMsg.toLowerCase().includes("unsupported get request")) {
        return {
          valid: false,
          error: `Meta could not access Catalog ID ${cleanCatalogId}. Please ensure: 1) You entered your Catalog ID (e.g. 2366911393556417), NOT your System User ID (61593935072406), and 2) The Catalog is assigned to 'Dilnova Sync' under Meta Business Settings > System Users > Assign Assets > Catalogs.`,
        };
      }
      return {
        valid: false,
        error: rawMsg,
      };
    }

    return {
      valid: true,
      catalogName: data.name || `Catalog ${cleanCatalogId}`,
      businessId: data.business?.id,
    };
  } catch (error) {
    logger.error("Meta catalog connection test failed", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Network error contacting Meta API",
    };
  }
}

/**
 * Executes an async items_batch operation (CREATE, UPDATE, or DELETE) on a Meta Commerce Catalog.
 */
export async function sendMetaItemsBatch({
  catalogId,
  accessToken,
  payload,
}: {
  catalogId: string;
  accessToken: string;
  payload: MetaBatchPayload;
}): Promise<MetaBatchResponse> {
  const cleanCatalogId = catalogId.trim().replace(/[^0-9]/g, "");
  const cleanAccessToken = accessToken.trim();

  try {
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(
      cleanCatalogId,
    )}/items_batch`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      logger.warn("Meta items_batch API responded with error", {
        catalogId,
        status: response.status,
        error: data.error,
      });
      return {
        error: data.error || {
          message: `HTTP ${response.status}`,
          type: "HTTP_ERROR",
          code: response.status,
        },
      };
    }

    return {
      handles: data.handles || [],
    };
  } catch (error) {
    logger.error("Failed to execute Meta items_batch", { catalogId, error });
    return {
      error: {
        message: error instanceof Error ? error.message : "Network failure contacting Meta",
        type: "NETWORK_ERROR",
        code: 500,
      },
    };
  }
}

/**
 * Polls the status of an async batch request using the handle returned by sendMetaItemsBatch.
 */
export async function checkBatchStatus({
  catalogId,
  accessToken,
  handle,
}: {
  catalogId: string;
  accessToken: string;
  handle: string;
}): Promise<MetaBatchStatusResponse> {
  try {
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(
      catalogId,
    )}/check_batch_request_status?handle=${encodeURIComponent(handle)}&access_token=${encodeURIComponent(
      accessToken,
    )}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Failed to check Meta batch status", { catalogId, handle, error });
    return {
      status: "ERROR",
      error: {
        message: error instanceof Error ? error.message : "Network error checking batch status",
        code: 500,
      },
    };
  }
}
