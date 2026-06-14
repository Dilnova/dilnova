# Shared infrastructure

Cross-cutting utilities used by all features. **Must not import from `features/`.**

| Module | Role |
|--------|------|
| `security/rate-limit.ts` | Upstash + in-memory rate limiting |
| `security/async-context.ts` | Request correlation IDs |
| `audit/logger.ts` | Audit trail persistence |
| `auth/superadmin-guard.ts` | Global admin role check |
| `auth/clerk-cache.ts` | Clerk org list + user role cache |
| `db/client.ts` | Database client (shim → `@/db` until migrated) |
| `db/schema/` | Drizzle schema split by domain (platform, catalog, inventory, orders, billing) |
| `db/schema.ts` | Barrel re-export of `db/schema/` |
| `validation/primitives.ts` | Shared Zod primitives |

Import via `@/shared/...` in new code. Legacy `@/utils/*` shims remain during migration.
