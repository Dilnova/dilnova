import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db/client", () => ({
  db: {},
}));
import {
  buildCatalogSearchParams,
  parseCatalogQueryParams,
  parseCatalogSort,
  parsePriceToCents,
  resolveVendorOrgId,
} from "@/features/catalog/queries";

describe("catalogQuery", () => {
  it("parses catalog query params with defaults", () => {
    const params = parseCatalogQueryParams({});
    expect(params.sort).toBe("newest");
    expect(params.stock).toBe("all");
    expect(params.type).toBe("all");
  });

  it("parses sort, vendor, price, and stock filters", () => {
    const params = parseCatalogQueryParams({
      sort: "price_asc",
      vendor: "acme-store",
      minPrice: "10",
      maxPrice: "5",
      stock: "in_stock",
      type: "product",
      search: "soil",
      page: "2",
    });

    expect(params.sort).toBe("price_asc");
    expect(params.vendorSlug).toBe("acme-store");
    expect(params.minPriceCents).toBe(1000);
    expect(params.maxPriceCents).toBe(1000);
    expect(params.stock).toBe("in_stock");
    expect(params.page).toBe(2);
  });

  it("falls back to default sort for invalid values", () => {
    expect(parseCatalogSort("invalid")).toBe("newest");
    expect(parsePriceToCents("-1")).toBeNull();
  });

  it("resolves vendor slug to org id", () => {
    expect(resolveVendorOrgId("acme", [{ id: "org_1", slug: "acme", name: "Acme" }])).toBe("org_1");
    expect(resolveVendorOrgId("missing", [])).toBeNull();
  });

  it("builds URL search params for pagination links", () => {
    const params = parseCatalogQueryParams({
      sort: "rating_desc",
      vendor: "acme",
      minPrice: "12.50",
      stock: "in_stock",
    });
    const searchParams = buildCatalogSearchParams(params, 3);

    expect(searchParams.get("sort")).toBe("rating_desc");
    expect(searchParams.get("vendor")).toBe("acme");
    expect(searchParams.get("minPrice")).toBe("12.50");
    expect(searchParams.get("stock")).toBe("in_stock");
    expect(searchParams.get("page")).toBe("3");
  });
});
