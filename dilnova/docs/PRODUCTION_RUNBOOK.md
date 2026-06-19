# Production Runbook — Dilnova / dilstar.pp.ua

## Pre-launch checklist

```bash
cd dilnova
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm db:verify
DATABASE_URL="..." pnpm db:migrate

# Clerk one-time migrations (dry-run first)
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-bank-metadata.mjs --dry-run
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-superadmin-metadata.mjs --dry-run
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-bank-metadata.mjs
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-superadmin-metadata.mjs

# Local env sanity (optional)
node scripts/pre-launch-check.mjs
```

### Browser smoke tests

1. Customer checkout → order appears in `/customer`
2. Foreign invoice URL → 404
3. Vendor member blocked from catalog admin; admin allowed
4. Superadmin gate on `/superadmin`
5. Bank details only on invoice (not storefront HTML)
6. Image upload on vendor catalog

### Monitoring & Log Aggregation

- Public uptime: `GET https://www.dilstar.pp.ua/api/health` → `{"status":"ok"}`
- Detailed probe: `Authorization: Bearer $HEALTH_CHECK_SECRET`
- Error Tracking: Configure `SENTRY_DSN` in Vercel for server and client error alerts.
- Log Aggregation (Log Drain): Configure a Vercel Log Drain to export structured application JSON logs to a dedicated log aggregation service (such as **Axiom**, **Datadog**, or **Betterstack**) with a minimum of 90 days retention to support compliance and forensic auditing.

---

## Rollback

### Application (fast — minutes)

1. Vercel → Project → Deployments
2. Find last known-good deployment → **Promote to Production**

### Database (slow — use only if schema/data bad)

1. Supabase → Database → Backups / Point-in-time recovery
2. Restore to timestamp before bad migration or data incident
3. **Note:** Drizzle migrations are forward-only; app rollback does not undo SQL

### Clerk metadata migrations

- Bank/superadmin migrations are **not auto-reversible**
- Keep dry-run output before applying
- Revert manually in Clerk Dashboard if needed

---

## Incident response

| Symptom | First action |
|---------|----------------|
| 503 on health | Check Supabase + Upstash status; verify `DATABASE_URL` / Upstash tokens |
| Upload failures | Verify `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` on Vercel |
| Checkout emails fail | Verify `SMTP_*` and `EMAIL_FROM_*` env vars |
| Rate limit false positives | Check Upstash dashboard; verify REST URL/token |
| Auth loops | Confirm Clerk keys match environment (live vs test) |

---

## Required Vercel environment variables (production)

See `.env.example`. Runtime validation runs on server start in production.

---

## Post-launch (week 1)

- Run `pnpm test:e2e` with real `E2E_*_EMAIL` GitHub secrets
- Review Vercel logs daily
- Plan PostgreSQL RLS if multi-tenant DB defense-in-depth is required
