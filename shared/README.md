# Shared infrastructure

Cross-cutting utilities used by all features. **Must not import from `features/`.**

| Module | Role |
|--------|------|
| `security/rate-limit.ts` | Upstash + in-memory rate limiting |
| `security/upstash-health.ts` | Upstash connectivity probe |
| `security/async-context.ts` | Request correlation IDs |
| `audit/logger.ts` | Audit trail persistence |
| `auth/superadmin-guard.ts` | Global admin role check |
| `auth/clerk-cache.ts` | Clerk org list + user role cache |
| `db/client.ts` | Drizzle database client |
| `db/schema/` | Drizzle schema split by domain |
| `db/schema.ts` | Barrel re-export of `db/schema/` |
| `logging/logger.ts` | Structured JSON logger |
| `platform/settings.ts` | Cached system settings reads |
| `platform/brand.ts` | Default URLs and brand constants |
| `email/smtp-client.ts` | Raw SMTP client |
| `email/delivery.ts` | Email sender config + dispatch |
| `media/media.ts` | Video URL detection |
| `media/cloudinary-url.ts` | Cloudinary URL validation |
| `media/cloudinary-upload.ts` | Browser Cloudinary upload |
| `validation/primitives.ts` | Shared Zod primitives |

Import via `@/shared/...` in new code. Legacy `@/utils/*` and `@/db` shims remain until grep shows zero old imports.
