# pnpm — Official Reference

> **Version in use**: `9` (CI), `^8+` (minimum)
> **Official docs**: https://pnpm.io

---

## Key Docs Links

| Topic | URL |
|---|---|
| Motivation | https://pnpm.io/motivation |
| Installation | https://pnpm.io/installation |
| CLI Commands | https://pnpm.io/cli/add |
| `pnpm install` | https://pnpm.io/cli/install |
| `pnpm run` | https://pnpm.io/cli/run |
| `pnpm exec` | https://pnpm.io/cli/exec |
| `pnpm audit` | https://pnpm.io/cli/audit |
| Workspaces | https://pnpm.io/workspaces |
| `.npmrc` Configuration | https://pnpm.io/npmrc |
| `pnpm-lock.yaml` | https://pnpm.io/git#lockfiles |
| Filtering | https://pnpm.io/filtering |

---

## How Dilnova Uses pnpm

### Key Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start dev server
pnpm build                # Production build
pnpm test                 # Run unit tests (Vitest)
pnpm lint                 # Run ESLint
pnpm test:e2e             # Run Playwright E2E tests
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Apply migrations
pnpm db:push              # Push schema (dev only)
pnpm db:studio            # Open Drizzle Studio
pnpm db:verify            # Verify migration integrity
pnpm pre-launch           # Pre-launch env check
```

### CI Usage

```bash
pnpm install --frozen-lockfile   # CI installs (no lockfile changes)
pnpm audit --audit-level=high    # Security audit
```

### Workspace Config

```yaml
# pnpm-workspace.yaml
packages:
  - '.'
```
