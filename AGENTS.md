# Dilnova Commerce Hub — Agent Guide

## What this is

Multi-tenant eCommerce sandbox: Next.js 16 + Clerk RBAC + Drizzle ORM + PostgreSQL (Supabase). Deployed on Vercel (hnd1 region).

## Commands

| Task                  | Command                  |
| --------------------- | ------------------------ |
| Dev server            | `pnpm dev`               |
| Full build            | `pnpm build`             |
| Lint                  | `pnpm lint`              |
| Typecheck             | `pnpm exec tsc --noEmit` |
| Unit tests            | `pnpm test`              |
| E2E tests             | `pnpm test:e2e`          |
| E2E browser install   | `pnpm test:e2e:install`  |
| DB generate migration | `pnpm db:generate`       |
| DB migrate            | `pnpm db:migrate`        |
| DB push (local only)  | `pnpm db:push`           |
| DB verify journal     | `pnpm db:verify`         |
| Env check             | `pnpm pre-launch`        |

**`pnpm build` is a gate**, not just `next build`. It runs: `pre-launch-check → lint → tsc --noEmit → vitest run → next build --webpack`. All must pass.

## Next.js 16 gotchas

- **`proxy.ts` replaces `middleware.ts`.** Do not create or edit `middleware.ts`.
- `next build --webpack` is used explicitly (not Turbopack).
- Read guides in `node_modules/next/dist/docs/` before writing Next.js code — APIs may differ from training data.

## Architecture

```
app/           # Next.js App Router routes (grouped by role: (admin), (vendor), (customer), (superadmin))
features/      # Business logic, organized by domain (billing, catalog, inventory, orders, cart, etc.)
shared/        # Cross-cutting infra (auth, db, security, email, media, validation, platform)
components/    # Shared layout/home components
db/            # DEPRECATED shims → import from @/shared/db/ instead
drizzle/       # SQL migration files + journal
tests/         # unit/ (vitest) and e2e/ (Playwright)
scripts/       # One-off tooling scripts
```

**Dependency rule:** `shared/` must NOT import from `features/`. `features/` imports from `shared/`. `app/` imports from both.

## Key patterns

### Multi-tenant isolation (critical)

- All DB queries must be scoped by `orgId` from Clerk's `auth()`.
- Never skip the `orgId` filter — cross-tenant data exposure is a security bug.

### RBAC layers

- **Superadmin**: `publicMetadata.role === "admin"` in Clerk → `/superadmin` routes.
- **Org admin** (`org:admin`): catalog management, member console, full POS.
- **Org member** (`org:member`): POS checkout, add listings only (no catalog dashboard).
- Role checks must be duplicated at the Server Action level, not just in UI.

### Imports and aliases

- `@/*` → project root, `@/features/*` → features, `@/shared/*` → shared.
- `db/index.ts` and `db/schema.ts` are **deprecated shims** — use `@/shared/db/client` and `@/shared/db/schema`.
- `@/utils/*` no longer exists — everything moved to `@/shared/`.

### Validation

- Zod schemas for server actions. Shared primitives at `@/shared/validation/primitives.ts`.
- Import as `from 'zod/v3'` (compat import path used in this repo).

### Schema

- Drizzle schema split across `shared/db/schema/` (billing.ts, catalog.ts, inventory.ts, orders.ts, platform.ts).
- Barrel re-export in `shared/db/schema.ts`.
- `MIGRATION_DATABASE_URL` for migrations (port 5432 direct), `DATABASE_URL` for app runtime (port 6543 pooler).

## Testing

### Unit tests (Vitest)

- Location: `tests/unit/`
- Config mocks `next/cache`, `next/headers`, `server-only` via aliases in `vitest.config.ts`.
- `db/seed.ts` is excluded from tsconfig.

### E2E tests (Playwright)

- Location: `tests/e2e/`
- Requires Clerk dev keys in `.env.local`.
- Run `pnpm test:e2e:install` once for Chromium.
- If `ERR_PNPM_IGNORED_BUILDS` on first run, execute `pnpm approve-builds --all`.
- Authenticated suites need `E2E_*_EMAIL` env vars (vendor-admin, vendor-member, customer, superadmin).
- Authenticated suites skip gracefully when env vars are missing.
- Security IDOR tests need seeded multi-tenant data (at least 2 customers + 2 vendor orgs).
- On CI, E2E runs after build artifact upload with dummy env — only smoke tests pass. Full RBAC needs real Clerk keys locally.

### CI pipeline

Parallel jobs: audit, lint, typecheck, db-verify, test-unit, build. E2E depends on build. Secrets scan (gitleaks) runs separately.

## Conventions

- Strict TypeScript (`strict: true`, no `any` — lint warns on `@typescript-eslint/no-explicit-any`).
- Gitleaks pre-commit hook installed via `pnpm prepare` — scans staged changes for secrets.
- `scratch/` is gitignored — safe for experiments and temporary files.
- `.env.local` is the local env file (gitignored). Copy from `.env.example`.
- CSP with nonce-based script-src configured in `proxy.ts`.
