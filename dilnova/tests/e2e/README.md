# Playwright E2E

## Quick start

1. Copy `.env.example` → `.env.local` with valid Clerk dev keys.
2. `pnpm test:e2e:install` (once).
3. `pnpm test:e2e`

### GitHub Actions (optional)

CI runs on every push/PR to `main`/`master` (`.github/workflows/ci.yml`):

| Job | What runs |
|-----|-----------|
| **quality** | `pnpm lint`, `tsc`, `pnpm test`, Drizzle verify |
| **build** | `pnpm build` (dummy env) |
| **e2e** | `pnpm test:e2e` smoke (public + unauthenticated) |

**Vercel environment variables** are what your live app uses — you do **not** need to duplicate them in GitHub unless you want full RBAC/security E2E on every PR in CI.

**Recommended workflow without GitHub secrets:**

1. Keep secrets in **Vercel** only (production + preview).
2. Before deploy, run locally: `pnpm test:e2e` (all four `E2E_*_EMAIL` in `.env.local`).
3. Let CI enforce lint, typecheck, unit tests, and build.

Optional GitHub secrets (only if you want authenticated E2E in CI):

| Secret | Purpose |
|--------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dev publishable key |
| `CLERK_SECRET_KEY` | Clerk dev secret (Clerk testing token) |
| `DATABASE_URL` | Staging DB for cross-tenant IDOR fixtures |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limit parity with prod |
| `E2E_VENDOR_ADMIN_EMAIL` | Pre-created vendor admin test user |
| `E2E_VENDOR_MEMBER_EMAIL` | Pre-created vendor member test user |
| `E2E_CUSTOMER_EMAIL` | Pre-created customer test user |
| `E2E_SUPERADMIN_EMAIL` | User with `publicMetadata.role = admin` |

Without GitHub secrets, CI runs **smoke E2E** only (authenticated suites skip). Run `pnpm test:e2e` locally before deploy for the full 47-test matrix.

Public + unauthenticated RBAC tests run with Clerk keys only.

## Full RBAC (optional)

Create four test users in your **Clerk dev instance**:

| User | Requirement |
|------|-------------|
| Vendor admin | Active org, role `org:admin` |
| Vendor member | Same org, role `org:member` |
| Customer | Signed-in user, no vendor org (or different org) |
| Superadmin | `privateMetadata.platformRole = "superadmin"` (or legacy `publicMetadata.role = "admin"` until migrated) |

Add to `.env.local`:

```env
E2E_VENDOR_ADMIN_EMAIL=vendor-admin@test.example
E2E_VENDOR_MEMBER_EMAIL=vendor-member@test.example
E2E_CUSTOMER_EMAIL=customer@test.example
E2E_SUPERADMIN_EMAIL=superadmin@test.example
```

**Security IDOR suites** also need `DATABASE_URL` and seeded data from **at least two customers and two vendor orgs** (orders + products). If cross-tenant rows are missing, those tests skip with a clear message.

Clerk's `clerk.signIn({ emailAddress })` uses `CLERK_SECRET_KEY` — no password needed when configured in dev.

## What is tested

- **Public routes** — `/`, `/products`, `/cart`, `/contact` load without sign-in.
- **Unauthenticated** — vendor/admin/superadmin/customer redirect to sign-in or `/unauthorized`.
- **Vendor admin** — `/vendor` + `/admin` allowed; `/superadmin` denied.
- **Vendor member** — `/vendor` + `/vendor/billing` allowed; `/admin` denied.
- **Customer** — `/customer` allowed; vendor/superadmin denied.
- **Superadmin** — `/superadmin` allowed; vendor denied without org membership.

### Security (`e2e/security/`)

Direct **server-action IDOR** and **invoice route IDOR** checks (requires E2E users + seeded multi-tenant data):

- Customer — foreign invoice URL, foreign payment slip upload, blocked vendor mutations
- Vendor member — blocked delete/verify/cancel/reject order actions
- Vendor admin — cross-tenant product delete and order actions; blocked superadmin mutations
- Superadmin — blocked vendor org actions without membership; org role mutation guard
- Unauthenticated — key mutations rejected without session

Helpers: `helpers/server-action.ts` (manifest lookup + RSC `encodeReply`), `helpers/security-fixtures.ts` (DB cross-tenant ids).
