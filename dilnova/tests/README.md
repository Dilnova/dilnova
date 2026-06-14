# Tests

| Folder | Purpose |
|--------|---------|
| `unit/features/` | Vitest tests colocated by feature (migrate from `utils/*.test.ts`) |
| `integration/` | DB + server actions together |
| `e2e/rbac/` | Playwright role-based flows |
| `e2e/security/` | IDOR, cross-tenant attack scenarios |

Vendor org unit tests still run via `utils/vendorOrgIntegrity.test.ts` (shim path) until moved here.
