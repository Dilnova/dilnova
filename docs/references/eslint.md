# ESLint — Official Reference

> **Version in use**: `^9`
> **Official docs**: https://eslint.org/docs/latest/

---

## Key Docs Links

| Topic | URL |
|---|---|
| Getting Started | https://eslint.org/docs/latest/use/getting-started |
| Configuration (Flat Config) | https://eslint.org/docs/latest/use/configure/ |
| Rules Reference | https://eslint.org/docs/latest/rules/ |
| CLI Reference | https://eslint.org/docs/latest/use/command-line-interface |
| Plugins | https://eslint.org/docs/latest/use/configure/plugins |
| Shareable Configs | https://eslint.org/docs/latest/extend/shareable-configs |
| Migration to v9 (Flat Config) | https://eslint.org/docs/latest/use/configure/migration-guide |

### Next.js ESLint Plugin
| Topic | URL |
|---|---|
| eslint-config-next | https://nextjs.org/docs/app/api-reference/config/eslint |
| Core Web Vitals rules | https://nextjs.org/docs/app/api-reference/config/eslint#core-web-vitals |

---

## Dilnova ESLint Setup

- Uses **ESLint v9 Flat Config** (`eslint.config.mjs`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Run with `pnpm lint`

### Current Overrides

```js
rules: {
  "react-hooks/set-state-in-effect": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "react-hooks/exhaustive-deps": "off",
  "@next/next/no-img-element": "off",
}
```

### Ignored Paths

- `.next/**`, `out/**`, `build/**`, `dist/**`, `scratch/**`
- `tests/e2e/helpers/rsc-encode.cjs` (CJS helper for Playwright)
