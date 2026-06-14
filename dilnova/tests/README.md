# E2E tests (Playwright)

| Folder | Purpose |
|--------|---------|
| `e2e/rbac/` | Route-level RBAC checks (public, unauthenticated, role-specific) |
| `e2e/fixtures/` | Shared Playwright fixtures (Clerk testing token) |
| `e2e/helpers/` | Route constants, env helpers |
| `unit/features/` | Vitest tests colocated by feature (migrate from `utils/*.test.ts`) |
| `integration/` | DB + server actions together |
| `e2e/security/` | (planned) IDOR, cross-tenant attack scenarios |

## Commands

```bash
pnpm test:e2e:install   # one-time Chromium install
pnpm test:e2e           # run all E2E (starts dev server; uses node directly to avoid pnpm hook issues)
pnpm test:e2e:ui        # interactive UI mode
```

If `pnpm test:e2e` fails with `ERR_PNPM_IGNORED_BUILDS` on first setup, run `pnpm approve-builds --all` once (already configured in `pnpm-workspace.yaml` for this repo).

## RBAC suites

| Suite | Requires sign-in | Env vars |
|-------|------------------|----------|
| `public-routes` | No | Clerk keys (via `.env.local`) for testing token |
| `unauthenticated` | No | Clerk keys |
| `vendor-admin`, `vendor-member`, `customer`, `superadmin` | Yes | `E2E_*_EMAIL` per role |

Authenticated suites **skip gracefully** when the corresponding `E2E_*_EMAIL` is unset or sign-in fails.

See [e2e/README.md](./e2e/README.md) for Clerk test user setup.

Vendor org unit tests still run via `utils/vendorOrgIntegrity.test.ts` (shim path) until moved under `unit/features/`.
