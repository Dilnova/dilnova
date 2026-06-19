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

### Database Disaster Recovery (RTO / RPO & Restore Procedures)

#### Disaster Recovery Targets
- **Recovery Time Objective (RTO)**: 4 hours (target maximum time to restore full service).
- **Recovery Point Objective (RPO)**: 1 hour (target maximum data loss window, achieved via PITR).

#### Backup Strategy
- **PITR (Point-in-Time Recovery)**: Must be enabled in Supabase Dashboard (Database → Backups) to allow physical backups and logical log recovery to any given second.
- **Daily Backups**: Supabase automatically captures daily logical dumps (retained for 7 days on free/Pro, up to 30 days on Enterprise).

#### Database Restore Runbook
1. Log into the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to your project -> **Database** -> **Backups**.
3. Under **Point-in-Time Recovery (PITR)**, select the target timestamp you wish to restore to (choose a time immediately prior to the data corruption or migration failure).
4. Click **Restore Database**. Note that the restore process takes the database offline temporarily.
5. **Important Note**: Drizzle migrations are forward-only. A code/application rollback does not automatically undo SQL schema changes, so a database restore is the primary method to revert destructive DDL changes.

#### Quarterly Restore Drills
- DevOps / Database Admin must schedule and execute restore drills every quarter.
- **Procedure**: Restore a production snapshot onto a temporary staging database clone, apply migrations, and verify integrity of tables, data decryption (using `PII_ENCRYPTION_KEY`), and core application queries.

### Clerk Metadata Recovery

- Clerk metadata migrations are **not auto-reversible**.
- Before applying clerk metadata updates, always keep a copy of the migration dry-run output.
- In case of failures, revert values manually inside the Clerk Dashboard (Users -> click User -> edit privateMetadata).

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

---

## Load Testing & Performance Baselines

To ensure the application functions reliably under realistic concurrent loads, load testing is conducted using **k6**.

### Execution Command

To execute load tests targeting the main read paths, run the following:

```bash
# Run local load test targeting localhost
k6 run scripts/load-test-k6.js

# Run load test targeting staging or production environment
TARGET_URL="https://www.dilstar.pp.ua" k6 run scripts/load-test-k6.js
```

### Baseline Performance Targets (Throughput & Latency)

Under normal operating conditions, the application must meet the following performance baselines:

| Service / Endpoint | Method | Target Concurrency | Target Throughput | Target Latency (p95) |
|---|---|---|---|---|
| **Product Catalog (Home)** | GET `/` | 50 VUs | 250 RPS | < 120ms |
| **Product Listing & Search** | GET `/products` | 50 VUs | 200 RPS | < 150ms |
| **Contact Form Page** | GET `/contact` | 50 VUs | 50 RPS | < 100ms |
| **Cart Page** | GET `/cart` | 50 VUs | 50 RPS | < 100ms |

### Monitoring & Alerting Thresholds

Alerts should be configured in the monitoring platform (e.g. Vercel Analytics, Sentry, or custom Log Drain alerting rules) based on the following limits:

*   **Warning Alert (Degraded Performance)**:
    *   Error rate: `> 1.0%` of all requests over a 5-minute window.
    *   Latency: p95 response time `> 1.5 seconds` on any public route.
*   **Critical Alert (Potential Outage)**:
    *   Error rate: `> 5.0%` of all requests over a 1-minute window.
    *   Latency: p95 response time `> 3.0 seconds` on any public route.

### Write Path Constraints (Rate Limiting & Authentication)

Note that write-path endpoints (e.g. submitting a contact form or finalizing a checkout order) are protected by rate limiters and external systems:
1.  **Rate Limiting**: Contact form submission is capped at 2 requests/min per IP. Checkout is capped at 5 requests/min per IP. Under concurrent load tests, these endpoints will return rate limit errors by design.
2.  **Authentication & CAPTCHA**: Finalizing checkout requires Clerk authentication (unauthenticated requests will be denied with an authentication error). Submitting a contact form requires Cloudflare Turnstile verification.
Therefore, automated load testing scripts (`load-test-k6.js`) focus primarily on public read paths and static/SSR page rendering.

