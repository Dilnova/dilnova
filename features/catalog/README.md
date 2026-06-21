# Catalog

Product & service catalog: browse query/filters, vendor listings, categories, and product detail engagement.

**Public API:** `@/features/catalog`

| Module | Role |
|--------|------|
| `query.ts` | Sort/filter/pagination for `/products` |
| `schema.ts` | Zod schemas for catalog actions |
| `vendor.actions.ts` | Vendor add/delete product |
| `superadmin.actions.ts` | Category CRUD & product moderation |
| `product-detail.actions.ts` | Wishlist, reviews, Q&A, view counts |
| `components/` | Catalog filter UI |
