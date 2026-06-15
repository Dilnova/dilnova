# Playwright E2E

## Quick start

1. Copy `.env.example` → `.env.local` with valid Clerk dev keys.
2. `pnpm test:e2e:install` (once).
3. `pnpm test:e2e`

Public + unauthenticated RBAC tests run with Clerk keys only.

## Full RBAC (optional)

Create four test users in your **Clerk dev instance**:

| User | Requirement |
|------|-------------|
| Vendor admin | Active org, role `org:admin` |
| Vendor member | Same org, role `org:member` |
| Customer | Signed-in user, no vendor org (or different org) |
| Superadmin | `publicMetadata.role = "admin"` |

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
