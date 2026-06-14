# Dilnova architecture

Enterprise folder layout using **`features/`** (business domains) and **`shared/`** (infrastructure).

| Document | Purpose |
|----------|---------|
| [folder-conventions.md](./folder-conventions.md) | Rules, dependency boundaries, migration phases |
| [roles-and-routes.md](./roles-and-routes.md) | RBAC map (routes → roles → actions) |
| [server-actions.md](./server-actions.md) | `'use server'` export rules |
| [../shared/README.md](../shared/README.md) | Shared infrastructure modules |

## Quick map

```
app/        → Next.js routes & thin pages only
features/   → catalog, cart, orders, vendor-org, …
shared/     → db, auth, audit, rate-limit, validation
tests/      → unit, integration, e2e
```

## Migration status

| Feature | Status |
|---------|--------|
| `vendor-org` | **Migrated** (pilot) |
| `cart` | **Migrated** |
| `orders` | **Migrated** |
| `inventory` | **Migrated** |
| `catalog` | **Migrated** |
| `billing` | **Migrated** |
| `superadmin`, `organization`, `vendor`, `admin` | **Schema only** (actions still in `app/`) |

Legacy `@/utils/*` and `@/db/*` imports remain valid via shims until each domain is migrated.

**Shared infra (Phase 8):** `@/shared/security/*`, `@/shared/audit/*`, `@/shared/auth/*` now contain real implementations; `@/utils/rateLimit`, `asyncContext`, `auditLogger`, `authGuards`, `clerkCache` are shims.

**DB schema (Phase 9):** Canonical schema lives in `@/shared/db/schema/*` (platform, catalog, inventory, orders, billing); `@/db/schema` is a backward-compat shim.

**Validation (Phase 10):** Zod schemas live in `@/features/<domain>/schema`; `@/utils/schemas` is a backward-compat re-export barrel.
