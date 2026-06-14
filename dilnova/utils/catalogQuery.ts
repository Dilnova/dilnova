import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import * as schema from '@/db/schema';

export const CATALOG_SORT_VALUES = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
  'views_desc',
  'rating_desc',
] as const;

export type CatalogSort = (typeof CATALOG_SORT_VALUES)[number];

export const CATALOG_STOCK_FILTER_VALUES = ['all', 'in_stock'] as const;
export type CatalogStockFilter = (typeof CATALOG_STOCK_FILTER_VALUES)[number];

export interface CatalogQueryParams {
  search: string;
  categorySlug: string;
  type: string;
  page: number;
  sort: CatalogSort;
  vendorSlug: string;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  stock: CatalogStockFilter;
}

export interface CatalogCategoryRef {
  id: string;
  slug: string;
  parentId: string | null;
}

export interface CatalogVendorRef {
  id: string;
  slug: string | null;
  name: string;
}

const DEFAULT_SORT: CatalogSort = 'newest';

export function parseCatalogSort(value: string | undefined): CatalogSort {
  if (value && (CATALOG_SORT_VALUES as readonly string[]).includes(value)) {
    return value as CatalogSort;
  }
  return DEFAULT_SORT;
}

export function parseCatalogStockFilter(value: string | undefined): CatalogStockFilter {
  if (value && (CATALOG_STOCK_FILTER_VALUES as readonly string[]).includes(value)) {
    return value as CatalogStockFilter;
  }
  return 'all';
}

export function parsePriceToCents(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function parseCatalogPage(value: string | undefined): number {
  const parsed = Number.parseInt(value || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseCatalogQueryParams(
  raw: Record<string, string | undefined>
): CatalogQueryParams {
  const minPriceCents = parsePriceToCents(raw.minPrice);
  const maxPriceCents = parsePriceToCents(raw.maxPrice);

  return {
    search: raw.search?.trim() || '',
    categorySlug: raw.category?.trim() || '',
    type: raw.type?.trim() || 'all',
    page: parseCatalogPage(raw.page),
    sort: parseCatalogSort(raw.sort),
    vendorSlug: raw.vendor?.trim() || '',
    minPriceCents,
    maxPriceCents:
      minPriceCents != null && maxPriceCents != null && maxPriceCents < minPriceCents
        ? minPriceCents
        : maxPriceCents,
    stock: parseCatalogStockFilter(raw.stock),
  };
}

export function resolveVendorOrgId(
  vendorSlug: string,
  vendors: CatalogVendorRef[]
): string | null {
  if (!vendorSlug) return null;
  const match = vendors.find((vendor) => vendor.slug === vendorSlug);
  return match?.id ?? null;
}

export function buildCatalogWhereClauses(params: {
  search: string;
  categorySlug: string;
  type: string;
  vendorOrgId: string | null;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  stock: CatalogStockFilter;
  categories: CatalogCategoryRef[];
}): SQL | undefined {
  const whereClauses: SQL[] = [];

  if (params.search) {
    const sanitizedSearch = params.search.replace(/[%_]/g, '\\$&');
    whereClauses.push(
      or(
        ilike(schema.products.name, `%${sanitizedSearch}%`),
        ilike(schema.products.description, `%${sanitizedSearch}%`)
      )!
    );
  }

  if (params.categorySlug) {
    const selectedCategory = params.categories.find((category) => category.slug === params.categorySlug);
    if (selectedCategory) {
      if (!selectedCategory.parentId) {
        const subCategoryIds = params.categories
          .filter((category) => category.parentId === selectedCategory.id)
          .map((category) => category.id);
        whereClauses.push(
          inArray(schema.products.categoryId, [selectedCategory.id, ...subCategoryIds])
        );
      } else {
        whereClauses.push(eq(schema.products.categoryId, selectedCategory.id));
      }
    }
  }

  if (params.type !== 'all') {
    whereClauses.push(eq(schema.products.type, params.type));
  }

  if (params.vendorOrgId) {
    whereClauses.push(eq(schema.products.orgId, params.vendorOrgId));
  }

  if (params.minPriceCents != null) {
    whereClauses.push(gte(schema.products.price, params.minPriceCents));
  }

  if (params.maxPriceCents != null) {
    whereClauses.push(lte(schema.products.price, params.maxPriceCents));
  }

  if (params.stock === 'in_stock') {
    whereClauses.push(
      or(
        eq(schema.products.type, 'service'),
        sql`EXISTS (
          SELECT 1 FROM ${schema.inventory}
          WHERE ${schema.inventory.productId} = ${schema.products.id}
            AND ${schema.inventory.quantity} > 0
        )`
      )!
    );
  }

  whereClauses.push(eq(schema.products.status, 'active'));

  return and(...whereClauses);
}

export function buildCatalogOrderBy(sort: CatalogSort) {
  switch (sort) {
    case 'oldest':
      return [asc(schema.products.createdAt)];
    case 'price_asc':
      return [asc(schema.products.price), desc(schema.products.createdAt)];
    case 'price_desc':
      return [desc(schema.products.price), desc(schema.products.createdAt)];
    case 'name_asc':
      return [asc(schema.products.name)];
    case 'name_desc':
      return [desc(schema.products.name)];
    case 'views_desc':
      return [desc(schema.products.views), desc(schema.products.createdAt)];
    case 'rating_desc':
      return [
        sql`(SELECT COALESCE(AVG(${schema.reviews.rating}), 0) FROM ${schema.reviews} WHERE ${schema.reviews.productId} = ${schema.products.id}) DESC`,
        desc(schema.products.createdAt),
      ];
    case 'newest':
    default:
      return [desc(schema.products.createdAt)];
  }
}

export function buildCatalogSearchParams(
  params: CatalogQueryParams,
  page?: number
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set('search', params.search);
  if (params.categorySlug) searchParams.set('category', params.categorySlug);
  if (params.type !== 'all') searchParams.set('type', params.type);
  if (params.sort !== DEFAULT_SORT) searchParams.set('sort', params.sort);
  if (params.vendorSlug) searchParams.set('vendor', params.vendorSlug);
  if (params.minPriceCents != null) {
    searchParams.set('minPrice', (params.minPriceCents / 100).toFixed(2));
  }
  if (params.maxPriceCents != null) {
    searchParams.set('maxPrice', (params.maxPriceCents / 100).toFixed(2));
  }
  if (params.stock !== 'all') searchParams.set('stock', params.stock);

  const nextPage = page ?? params.page;
  if (nextPage > 1) searchParams.set('page', String(nextPage));

  return searchParams;
}

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  name_asc: 'Name: A–Z',
  name_desc: 'Name: Z–A',
  views_desc: 'Most Viewed',
  rating_desc: 'Top Rated',
};
