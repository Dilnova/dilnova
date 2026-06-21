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
