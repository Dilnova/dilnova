# Vitest — Official Reference

> **Version in use**: `^3.2.6`
> **Official docs**: https://vitest.dev/guide/

---

## Key Docs Links

| Topic            | URL                                         |
| ---------------- | ------------------------------------------- |
| Getting Started  | https://vitest.dev/guide/                   |
| Test API         | https://vitest.dev/api/                     |
| `expect` API     | https://vitest.dev/api/expect.html          |
| Mocking          | https://vitest.dev/guide/mocking.html       |
| Snapshot Testing | https://vitest.dev/guide/snapshot.html      |
| Coverage         | https://vitest.dev/guide/coverage.html      |
| Configuration    | https://vitest.dev/config/                  |
| CLI              | https://vitest.dev/guide/cli.html           |
| Testing Types    | https://vitest.dev/guide/testing-types.html |
| Workspace        | https://vitest.dev/guide/workspace.html     |

---

## How Dilnova Uses Vitest

- **Unit and integration tests** for server actions, utilities, schemas
- Config in `vitest.config.ts`
- Run with `pnpm test` (single run) or `pnpm vitest` (watch mode)

### Common Pattern

```ts
import { describe, it, expect, vi } from "vitest";

describe("createProduct", () => {
  it("should validate required fields", async () => {
    const result = await createProduct(new FormData());
    expect(result.error).toBeDefined();
  });
});
```
