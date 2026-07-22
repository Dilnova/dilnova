# Zod — Official Reference

> **Version in use**: `^4.4.3`
> **Official docs**: https://zod.dev

---

## Key Docs Links

| Topic                  | URL                              |
| ---------------------- | -------------------------------- |
| Getting Started        | https://zod.dev                  |
| Basic Types            | https://zod.dev/basics           |
| Objects                | https://zod.dev/api?id=objects   |
| Arrays                 | https://zod.dev/api?id=arrays    |
| Strings                | https://zod.dev/api?id=strings   |
| Numbers                | https://zod.dev/api?id=numbers   |
| Enums                  | https://zod.dev/api?id=enums     |
| Unions                 | https://zod.dev/api?id=unions    |
| Transforms             | https://zod.dev/api?id=transform |
| Error Handling         | https://zod.dev/error-handling   |
| TypeScript Integration | https://zod.dev/api?id=infer     |

---

## How Dilnova Uses Zod

- **Server action input validation** — every server action validates FormData with Zod
- **Environment variable validation** — runtime env checks on server start
- **API request/response schemas** — type-safe data contracts

### Common Patterns

```ts
import { z } from "zod";

// Schema definition
const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  description: z.string().optional(),
  orgId: z.string().min(1),
});

// Type inference
type Product = z.infer<typeof ProductSchema>;

// Validation in server action
export async function createProduct(formData: FormData) {
  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    price: Number(formData.get("price")),
    orgId,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // ... create product with parsed.data
}
```

---

## ⚠️ Zod v4 Note

Zod v4 is a major version with breaking changes from v3. Key differences:

- New error handling API
- Improved TypeScript inference
- `z.coerce` improvements
- Check https://zod.dev for v4-specific API
