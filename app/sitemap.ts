import { logger } from "@/shared/logging/logger";
import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { db } from "@/shared/db/client";
import { products, categories } from "@/shared/db/schema";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";
import { getCachedOrganizations } from "@/shared/auth/clerk-cache";

export const revalidate = 3600; // Regenerate sitemap at most once per hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let host = "";
  try {
    const headersList = await headers();
    host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  } catch {
    // headers() might not be available during static build export
  }

  const isDilstar = host.includes("dilstar.pp.ua");
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = host
    ? `${protocol}://${host}`
    : isDilstar
      ? "https://www.dilstar.pp.ua"
      : process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

  // ── DILSTAR BRAND SITEMAP ─────────────────────────────────────
  if (isDilstar) {
    let dilstarProductEntries: MetadataRoute.Sitemap = [];

    try {
      const orgs = await getCachedOrganizations();
      const dilstarOrgIds = orgs
        .filter(
          (o) =>
            o.slug === "dilstar" ||
            o.slug?.startsWith("dilstar-") ||
            o.slug === "distar" ||
            o.slug?.startsWith("distar-") ||
            o.name.toLowerCase().includes("dilstar") ||
            o.name.toLowerCase().includes("distar"),
        )
        .map((o) => o.id);

      const dbProducts = await db
        .select({
          id: products.id,
          orgId: products.orgId,
          updatedAt: products.updatedAt,
        })
        .from(products);

      const filtered = dbProducts.filter(
        (p) => dilstarOrgIds.length === 0 || dilstarOrgIds.includes(p.orgId),
      );

      dilstarProductEntries = filtered.map((p) => ({
        url: `${baseUrl}/products/${p.id}`,
        lastModified: p.updatedAt || new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
    } catch (error) {
      logger.error("Sitemap: Failed to load Dilstar brand products", error);
    }

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
      {
        url: `${baseUrl}/hardware`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.95,
      },
      {
        url: `${baseUrl}/tech`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/nursery`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/services`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.3,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.3,
      },
      {
        url: `${baseUrl}/refund`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.3,
      },
      ...dilstarProductEntries,
    ];
  }

  // ── DILNOVA MARKETPLACE SITEMAP ───────────────────────────────
  let productEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];
  let vendorEntries: MetadataRoute.Sitemap = [];

  try {
    const dbProducts = await db
      .select({
        id: products.id,
        updatedAt: products.updatedAt,
      })
      .from(products);

    productEntries = dbProducts.map((p) => ({
      url: `${baseUrl}/products/${p.id}`,
      lastModified: p.updatedAt || new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch (error) {
    logger.error("Sitemap: Failed to load products for sitemap", error);
  }

  try {
    const dbCategories = await db
      .select({
        slug: categories.slug,
        createdAt: categories.createdAt,
      })
      .from(categories);

    categoryEntries = dbCategories.map((c) => ({
      url: `${baseUrl}/products?category=${c.slug}`,
      lastModified: c.createdAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    logger.error("Sitemap: Failed to load categories for sitemap", error);
  }

  try {
    const orgs = await getCachedOrganizations();
    vendorEntries = orgs
      .filter((o) => !!o.slug)
      .map((o) => ({
        url: `${baseUrl}/vendors/${o.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch (error) {
    logger.error("Sitemap: Failed to load vendor orgs for sitemap", error);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/vendors`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    ...vendorEntries,
    ...categoryEntries,
    ...productEntries,
  ];
}
