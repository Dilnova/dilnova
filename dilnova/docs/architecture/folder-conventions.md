# Folder conventions (`features/` + `shared/`)

## Layers

### `app/` — routing shell

- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Auth redirects at layout level
- Compose UI from `@/features/*`; no business logic or direct DB access

### `features/<domain>/` — business code

Each domain owns its rules, validation, and mutations.

```
features/<domain>/
├── schema.ts       # Zod schemas for this domain
├── queries.ts      # Read-only DB (orgId-scoped where required)
├── mutations.ts    # Writes / transactions
├── actions.ts      # 'use server' thin wrappers (optional split)
├── components/     # Domain UI
├── index.ts        # Public exports — import from here
└── README.md       # Optional ownership notes
```

**Planned domains:** `auth`, `catalog`, `cart`, `orders`, `customer`, `vendor`, `inventory`, `billing`, `organization`, `superadmin`, `contact`, `storefront`

**Migrated:** `vendor-org`, `cart`, `orders`, `inventory`

### `shared/` — infrastructure (no product rules)

```
shared/
├── db/             # client, schema (split over time)
├── auth/           # Clerk cache, superadmin guard
├── validation/     # uuidField, shared Zod primitives
├── security/       # rate-limit, async context / correlation IDs
├── audit/          # audit logger
├── email/          # (planned)
├── media/          # (planned)
└── ui/             # dumb / design-system components (planned)
```

### `tests/`

```
tests/
├── unit/features/
├── integration/
└── e2e/rbac/
```

## Dependency rules

```
app/        → features/*, shared/*
features/*  → shared/*, other features via index.ts only
shared/*    → MUST NOT import features/*
```

## Security rules (every feature)

1. Layout guard + server action guard
2. Zod validate at action boundary
3. Filter tenant data with `orgId` from `auth()`
4. Audit log admin/vendor/superadmin mutations
5. Rate-limit sensitive actions

## Import examples

```ts
// Page
import { VendorOrgIssuesTab } from '@/features/vendor-org';
import { buildVendorOrgIntegrityReport } from '@/features/vendor-org';

// Server action inside a feature
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { rateLimit } from '@/shared/security/rate-limit';
```

## Migration phases

| Phase | Work |
|-------|------|
| **1** ✅ | Add `features/`, `shared/`, docs, tsconfig paths |
| **2** ✅ | Pilot: `features/vendor-org/` |
| **3** ✅ | Migrate `features/cart/` |
| **4** ✅ | Migrate `features/orders/` |
| **5** ✅ | Migrate `features/inventory/` |
| **6** | Move `shared/security`, `shared/audit`, `shared/auth` (real code, not shims) |
| **7** | Migrate `catalog` + `billing` |
| **8** | Split `db/schema.ts` under `shared/db/schema/` |
| **9** | Split `utils/schemas.ts` per feature |
| **10** | Add Playwright E2E under `tests/e2e/` |

## Backward compatibility

During migration, legacy paths re-export from new locations:

- `@/utils/vendorOrgIntegrity` → `@/features/vendor-org/integrity`
- `@/app/(superadmin)/superadmin/vendorOrgActions` → `@/features/vendor-org/reassign.actions`
- `@/utils/orderStatus`, `orderPayment`, `orderVendorScope`, etc. → `@/features/orders/*`
- `@/app/(vendor)/vendor/orderActions`, `@/app/(customer)/customer/orderActions` → `@/features/orders/*`
- `@/utils/inventoryStock`, `stockLedger`, `stockAvailability*` → `@/features/inventory/*`
- `@/app/(vendor)/vendor/products/inventoryActions` → `@/features/inventory/vendor.actions`

Remove shims only after grep shows zero old imports.
