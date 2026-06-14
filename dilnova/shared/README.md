# Shared infrastructure

Cross-cutting utilities used by all features. **Must not import from `features/`.**

| Module | Role |
|--------|------|
| `security/rate-limit.ts` | Upstash + in-memory rate limiting |
| `security/async-context.ts` | Request correlation IDs |
| `audit/logger.ts` | Audit trail persistence |
| `auth/superadmin-guard.ts` | Global admin role check |
| `auth/clerk-cache.ts` | Clerk org list + user role cache |
| `db/client.ts`, `db/schema.ts` | Database access (shims → `@/db` until Phase 9) |
| `validation/primitives.ts` | Shared Zod primitives |

Import via `@/shared/...` in new code. Legacy `@/utils/*` shims remain during migration.
