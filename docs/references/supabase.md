# Supabase — Official Reference

> **Version in use**: `@supabase/supabase-js ^2.108.1`
> **Official docs**: https://supabase.com/docs

---

## Key Docs Links

| Topic                     | URL                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| Getting Started           | https://supabase.com/docs/guides/getting-started                      |
| JavaScript Client Library | https://supabase.com/docs/reference/javascript/introduction           |
| Authentication            | https://supabase.com/docs/guides/auth                                 |
| Database                  | https://supabase.com/docs/guides/database/overview                    |
| Storage                   | https://supabase.com/docs/guides/storage                              |
| Storage (Signed URLs)     | https://supabase.com/docs/guides/storage/serving/downloads            |
| Row Level Security (RLS)  | https://supabase.com/docs/guides/database/postgres/row-level-security |
| Backups (PITR)            | https://supabase.com/docs/guides/platform/backups                     |
| Edge Functions            | https://supabase.com/docs/guides/functions                            |
| Realtime                  | https://supabase.com/docs/guides/realtime                             |
| Dashboard                 | https://supabase.com/dashboard                                        |

---

## How Dilnova Uses Supabase

### Database (PostgreSQL)

- Primary database host — Dilnova connects via `DATABASE_URL` using the `postgres` driver + Drizzle ORM
- Supabase manages backups, PITR, and infrastructure

### Storage

- **Payment slip uploads** stored in Supabase Storage buckets
- Time-limited signed URLs used for secure access (see `docs/architecture/supabase-storage.md`)
- Private buckets — no anonymous access

### Key Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:...@db.your-project.supabase.co:5432/postgres
```

---

## Common Patterns

### Storage Upload (Signed URL)

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Upload file
const { data, error } = await supabase.storage
  .from("payment-slips")
  .upload(`${orgId}/${fileName}`, file);

// Create signed URL (1 hour expiry)
const { data: signedUrl } = await supabase.storage
  .from("payment-slips")
  .createSignedUrl(filePath, 3600);
```

---

## ⚠️ Important Notes

- **Auth is handled by Clerk**, not Supabase Auth
- Database is accessed via **Drizzle ORM**, not Supabase client queries
- Supabase is primarily used for **Storage** and **managed PostgreSQL hosting**
- PITR must be enabled for disaster recovery (see `PRODUCTION_RUNBOOK.md`)
