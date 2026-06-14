# Dilnova architecture

Enterprise folder layout using **`features/`** (business domains) and **`shared/`** (infrastructure).

| Document | Purpose |
|----------|---------|
| [folder-conventions.md](./folder-conventions.md) | Rules, dependency boundaries, migration phases |
| [roles-and-routes.md](./roles-and-routes.md) | RBAC map (routes → roles → actions) |

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
| `catalog`, … | Planned — see folder-conventions.md |

Legacy `@/utils/*` and `@/db/*` imports remain valid via shims until each domain is migrated.
