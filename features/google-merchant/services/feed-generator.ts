import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getOrgCurrencySettings } from "@/shared/currency/exchange-rates.service";
import { logger } from "@/shared/logging/logger";

interface FeedGeneratorOptions {
  orgId?: string;
  baseUrl: string;
}

interface FeedValidationItem {
  id: string;
  name: string;
  sku: string | null;
  hasImage: boolean;
  hasPrice: boolean;
  hasDescription: boolean;
  isReady: boolean;
  issues: string[];
}

export interface FeedValidationResult {
  totalProducts: number;
  readyProducts: number;
  skippedProducts: number;
  currency: string;
  items: FeedValidationItem[];
}

/**
 * Escapes XML special characters for safety within XML elements.
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Strips HTML tags and normalizes whitespace for clean Google descriptions.
 */
function cleanDescription(htmlOrText: string): string {
  const stripped = htmlOrText
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 5000);
}

/**
 * Validates products in the vendor's catalog for Google Merchant Center readiness.
 */
export async function validateCatalogForGoogle(orgId: string): Promise<FeedValidationResult> {
  const activeProducts = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.orgId, orgId),
        or(eq(schema.products.status, "active"), eq(schema.products.status, "ACTIVE")),
      ),
    );

  const orgCurrency = await getOrgCurrencySettings(orgId);
  const currency = orgCurrency.baseCurrency || "LKR";

  const items: FeedValidationItem[] = [];
  let readyCount = 0;
  let skippedCount = 0;

  for (const prod of activeProducts) {
    const issues: string[] = [];
    const hasImage = Boolean(
      prod.imageUrl?.trim() ||
      (Array.isArray(prod.media) &&
        (prod.media as unknown[]).some(
          (m) => m && (typeof m === "string" ? Boolean(m) : Boolean((m as { url?: string }).url)),
        )),
    );
    const hasPrice = Number(prod.price) > 0;
    const hasDescription = Boolean(prod.description?.trim());

    if (!hasImage) {
      issues.push("Missing primary product photo");
    }
    if (!hasPrice) {
      issues.push("Price must be greater than 0");
    }
    if (!hasDescription) {
      issues.push("Missing product description");
    }

    const isReady = issues.length === 0;
    if (isReady) {
      readyCount++;
    } else {
      skippedCount++;
    }

    items.push({
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      hasImage,
      hasPrice,
      hasDescription,
      isReady,
      issues,
    });
  }

  return {
    totalProducts: activeProducts.length,
    readyProducts: readyCount,
    skippedProducts: skippedCount,
    currency,
    items,
  };
}

/**
 * Generates official Google Merchant Center RSS 2.0 XML product feed.
 */
export async function generateGoogleMerchantFeed({
  orgId,
  baseUrl,
}: FeedGeneratorOptions): Promise<string> {
  // Query active products
  const productConditions = [
    or(eq(schema.products.status, "active"), eq(schema.products.status, "ACTIVE")),
  ];
  if (orgId) {
    productConditions.push(eq(schema.products.orgId, orgId));
  }

  const activeProducts = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      description: schema.products.description,
      price: schema.products.price,
      currency: schema.products.currency,
      imageUrl: schema.products.imageUrl,
      media: schema.products.media,
      sku: schema.products.sku,
      barcodes: schema.products.barcodes,
      weightGrams: schema.products.weightGrams,
      updatedAt: schema.products.updatedAt,
      categoryId: schema.products.categoryId,
      orgId: schema.products.orgId,
    })
    .from(schema.products)
    .where(and(...productConditions));

  let brandName = "Dilnova Store";
  let defaultCurrency = "LKR";

  if (orgId) {
    const [integration] = await db
      .select({ brandName: schema.metaCatalogIntegrations.brandName })
      .from(schema.metaCatalogIntegrations)
      .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
      .limit(1);

    if (integration?.brandName) {
      brandName = integration.brandName;
    }

    try {
      const orgCurrency = await getOrgCurrencySettings(orgId);
      defaultCurrency = orgCurrency.baseCurrency || "LKR";
    } catch {
      // Fallback
    }
  }

  // Fetch category names for taxonomy mapping
  const categoryMap = new Map<string, string>();
  try {
    const allCategories = await db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories);
    for (const c of allCategories) {
      categoryMap.set(c.id, c.name);
    }
  } catch {
    // Ignore
  }

  // Fetch live inventory quantities
  const inventoryMap = new Map<string, number>();
  try {
    const productIds = activeProducts.map((p) => p.id);
    if (productIds.length > 0) {
      const allInventory = await db
        .select({
          productId: schema.inventory.productId,
          quantity: schema.inventory.quantity,
        })
        .from(schema.inventory);

      for (const inv of allInventory) {
        inventoryMap.set(inv.productId, inv.quantity);
      }
    }
  } catch (err) {
    logger.warn("Google Merchant feed: could not query inventory quantities", { err });
  }

  const itemsXml: string[] = [];

  for (const prod of activeProducts) {
    const isVideoUrl = (url: string) =>
      /\.(mp4|webm|ogg|mov|avi)($|\?)/i.test(url) || url.includes("/video/upload/");

    const allUrls: string[] = [];
    if (prod.imageUrl?.trim()) allUrls.push(prod.imageUrl.trim());
    if (Array.isArray(prod.media)) {
      for (const m of prod.media as unknown[]) {
        if (!m) continue;
        const url = typeof m === "string" ? m.trim() : (m as { url?: string }).url?.trim();
        if (url && !allUrls.includes(url)) allUrls.push(url);
      }
    }

    const imageUrls = allUrls.filter(
      (u) => (u.startsWith("http://") || u.startsWith("https://")) && !isVideoUrl(u),
    );

    if (imageUrls.length === 0) {
      continue;
    }

    const primaryImageUrl = imageUrls[0];
    const secondaryImages = imageUrls.slice(1, 11);

    const priceNum = Number(prod.price) || 0;
    const currency = prod.currency || defaultCurrency;
    const formattedPrice = `${priceNum.toFixed(2)} ${currency}`;

    const qty = inventoryMap.get(prod.id) ?? 1;
    const availability = qty > 0 ? "in_stock" : "out_of_stock";

    const title = prod.name ? escapeXml(prod.name.slice(0, 150)) : "Product";
    const description = prod.description ? escapeXml(cleanDescription(prod.description)) : title;
    const link = `${baseUrl}/products/${prod.id}`;
    const categoryName = prod.categoryId ? categoryMap.get(prod.categoryId) : undefined;

    // Check barcode / GTIN
    const gtin = Array.isArray(prod.barcodes) && prod.barcodes.length > 0 ? prod.barcodes[0] : null;

    let itemStr = `    <item>\n`;
    itemStr += `      <g:id>${escapeXml(prod.sku || prod.id)}</g:id>\n`;
    itemStr += `      <g:title>${title}</g:title>\n`;
    itemStr += `      <g:description>${description}</g:description>\n`;
    itemStr += `      <g:link>${escapeXml(link)}</g:link>\n`;
    itemStr += `      <g:image_link>${escapeXml(primaryImageUrl)}</g:image_link>\n`;

    for (const addImg of secondaryImages) {
      itemStr += `      <g:additional_image_link>${escapeXml(addImg)}</g:additional_image_link>\n`;
    }

    itemStr += `      <g:condition>new</g:condition>\n`;
    itemStr += `      <g:availability>${availability}</g:availability>\n`;
    itemStr += `      <g:price>${formattedPrice}</g:price>\n`;
    itemStr += `      <g:brand>${escapeXml(brandName)}</g:brand>\n`;

    if (gtin) {
      itemStr += `      <g:gtin>${escapeXml(String(gtin))}</g:gtin>\n`;
      itemStr += `      <g:identifier_exists>yes</g:identifier_exists>\n`;
    } else if (prod.sku) {
      itemStr += `      <g:mpn>${escapeXml(prod.sku)}</g:mpn>\n`;
      itemStr += `      <g:identifier_exists>yes</g:identifier_exists>\n`;
    } else {
      itemStr += `      <g:identifier_exists>no</g:identifier_exists>\n`;
    }

    if (categoryName) {
      itemStr += `      <g:product_type>${escapeXml(categoryName)}</g:product_type>\n`;
    }

    if (prod.weightGrams && prod.weightGrams > 0) {
      itemStr += `      <g:shipping_weight>${prod.weightGrams} g</g:shipping_weight>\n`;
    }

    itemStr += `    </item>`;
    itemsXml.push(itemStr);
  }

  const cleanStoreTitle = escapeXml(brandName);
  const cleanBaseUrl = escapeXml(baseUrl);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${cleanStoreTitle} - Google Product Feed</title>
    <link>${cleanBaseUrl}</link>
    <description>Official Google Merchant Center Product Feed for ${cleanStoreTitle}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml.join("\n")}
  </channel>
</rss>`;
}
