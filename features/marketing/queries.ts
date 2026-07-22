import { db } from "@/shared/db/client";
import { categories, products } from "@/shared/db/schema/catalog";
import { eq, desc, and } from "drizzle-orm";
import { getCachedOrganizations } from "@/shared/auth/clerk-cache";
import { logger } from "@/shared/logging/logger";

export type Product = {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  vendorName: string;
  vendorSlug: string;
};

export type FeaturedSeries = {
  id: string;
  title: string;
  description: string;
  products: Product[];
};

const formatPrice = (priceInCents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100);
};

/**
 * Fetches featured product series from the database.
 * We use active categories as "Series" and pull recent products for each.
 */
export async function getFeaturedSeries(): Promise<FeaturedSeries[]> {
  try {
    // 1. Fetch active categories
    const activeCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(desc(categories.createdAt))
      .limit(3);

    if (activeCategories.length === 0) {
      return [];
    }

    // 2. Fetch clerk organizations to map orgId to vendor details
    const organizations = await getCachedOrganizations();
    const orgMap = new Map(organizations.map((org) => [org.id, org]));

    const seriesPromises = activeCategories.map(async (category) => {
      // Fetch up to 4 recent products for this category
      const categoryProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.categoryId, category.id), eq(products.status, "active")))
        .orderBy(desc(products.createdAt))
        .limit(4);

      const mappedProducts: Product[] = categoryProducts.map((p) => {
        const org = orgMap.get(p.orgId);
        return {
          id: p.id,
          name: p.name,
          price: formatPrice(p.price),
          imageUrl: p.imageUrl || "",
          vendorName: org?.name || "Unknown Vendor",
          vendorSlug: org?.slug || p.orgId,
        };
      });

      return {
        id: category.id,
        title: category.name,
        description:
          category.localizedDescriptions?.["en"] || `Explore products in ${category.name}.`,
        products: mappedProducts,
      };
    });

    const seriesList = await Promise.all(seriesPromises);

    // Only return series that actually have products
    return seriesList.filter((series) => series.products.length > 0);
  } catch (error) {
    logger.error("Failed to fetch featured series", error);
    return [];
  }
}
