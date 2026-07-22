# Inventory

Inventory Management System (IMS): stock reservation, branch allocation, suppliers, POS billing, and stock availability catalog.

**Public API:** `@/features/inventory`

| Module                            | Role                                       |
| --------------------------------- | ------------------------------------------ |
| `reservation.ts`                  | Lock & deplete central/branch stock        |
| `ledger.ts`                       | Branch allocation helpers                  |
| `availability.shared.ts`          | Stock status definitions & purchase gating |
| `availability.server.ts`          | Load/validate catalog from system settings |
| `schema.ts`                       | Zod schemas for IMS actions                |
| `vendor.actions.ts`               | Vendor IMS + branches + POS checkout       |
| `superadmin.actions.ts`           | Superadmin inventory & IMS license         |
| `availability.actions.ts`         | Platform stock availability catalog        |
| `product-availability.actions.ts` | Per-product availability updates           |
| `components/`                     | Vendor workspace, superadmin tab, badges   |
