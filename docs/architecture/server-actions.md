# Server action files (`'use server'`)

Next.js **only allows async functions** to be exported from files marked `'use server'`.

## Do NOT export from action files

- Zod schemas (`export const fooSchema = z.object(...)`)
- Types (`export type`, `export interface`)
- Constants, helper functions, re-exports (`export * from`, `export { x } from`)
- React components

## Where those belong instead

| Export kind                           | File                                                 |
| ------------------------------------- | ---------------------------------------------------- |
| Zod schemas                           | `features/<domain>/schema.ts`                        |
| Types                                 | `features/<domain>/types.ts`                         |
| Pure helpers                          | `features/<domain>/query.ts`, `*.shared.ts`, etc.    |
| Server utilities (not client actions) | `'server-only'` module (no `'use server'`)           |
| Async mutations callable from client  | `*.actions.ts` with **only** `export async function` |

## Refactor impact

Moving code into `features/*/*.actions.ts` did **not** change business logic (auth, DB queries, validation rules). It only changed **file layout**. Runtime errors appear when non-action exports slip into `'use server'` files — fix by moving exports to the table above.

## Shims

Legacy shims (`app/**/actions.ts` re-exporting features) must **not** include `'use server'` if they re-export anything other than async functions. Prefer importing directly from `@/features/<domain>/...`.
