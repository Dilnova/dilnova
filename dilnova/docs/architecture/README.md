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
| `superadmin`, `organization`, `vendor`, `admin` | **Migrated** (actions + schemas) |
| `auth`, `contact`, `customer`, `storefront` | **Migrated** (core modules; some UI still in `app/`) |

Legacy `@/utils/*` and `@/db/*` imports remain valid via shims.

**Shared infra (Phase 8–12):** Real code in `@/shared/security/*`, `@/shared/audit/*`, `@/shared/auth/*`, `@/shared/logging/*`, `@/shared/platform/*`, `@/shared/email/*`, `@/shared/media/*`, `@/shared/db/*`.
