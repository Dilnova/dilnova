# TypeScript 5 — Official Reference

> **Version in use**: `^5`
> **Official docs**: https://www.typescriptlang.org/docs

---

## Key Docs Links

| Topic | URL |
|---|---|
| Handbook | https://www.typescriptlang.org/docs/handbook/intro.html |
| TypeScript Config (tsconfig) | https://www.typescriptlang.org/tsconfig |
| Utility Types | https://www.typescriptlang.org/docs/handbook/utility-types.html |
| Type Guards / Narrowing | https://www.typescriptlang.org/docs/handbook/2/narrowing.html |
| Generics | https://www.typescriptlang.org/docs/handbook/2/generics.html |
| Enums | https://www.typescriptlang.org/docs/handbook/enums.html |
| Declaration Files | https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html |
| Module Resolution | https://www.typescriptlang.org/docs/handbook/modules/theory.html |
| Decorators | https://www.typescriptlang.org/docs/handbook/decorators.html |
| Template Literal Types | https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html |

---

## Dilnova tsconfig Highlights

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }  // Path alias for imports
  }
}
```

- All imports use `@/` path alias (e.g., `@/shared/db`, `@/features/catalog`)
- Strict mode is enabled — no `any` without justification
