# Drizzle ORM — Official Reference

> **Version in use**: `drizzle-orm ^0.45.2`, `drizzle-kit ^0.31.10`
> **Official docs**: https://orm.drizzle.team/docs/overview

---

## Key Docs Links

| Topic | URL |
|---|---|
| Overview | https://orm.drizzle.team/docs/overview |
| PostgreSQL Setup | https://orm.drizzle.team/docs/get-started/postgresql-new |
| Schema Declaration | https://orm.drizzle.team/docs/sql-schema-declaration |
| Column Types (PostgreSQL) | https://orm.drizzle.team/docs/column-types/pg |
| Select (Queries) | https://orm.drizzle.team/docs/select |
| Insert | https://orm.drizzle.team/docs/insert |
| Update | https://orm.drizzle.team/docs/update |
| Delete | https://orm.drizzle.team/docs/delete |
| Joins | https://orm.drizzle.team/docs/joins |
| Filters (`where`) | https://orm.drizzle.team/docs/operators |
| Transactions | https://orm.drizzle.team/docs/transactions |
| Relations (Relational Queries) | https://orm.drizzle.team/docs/rqb |
| Migrations | https://orm.drizzle.team/docs/migrations |
| Drizzle Kit CLI | https://orm.drizzle.team/docs/kit-overview |
| `drizzle.config.ts` | https://orm.drizzle.team/docs/drizzle-config-file |

---

## How Dilnova Uses Drizzle

- **Schema**: Defined in `db/schema.ts`
- **Config**: `drizzle.config.ts` (PostgreSQL via `postgres` driver)
- **Migrations**: Stored in `drizzle/` directory

### Common Commands

```bash
pnpm db:generate    # Generate migration SQL from schema changes
pnpm db:migrate     # Apply migrations (production-safe)
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio GUI
pnpm db:verify      # Verify migration journal matches SQL files
```

### Common Patterns

```ts
// Query with filter
import { db } from '@/shared/db';
import { products } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const items = await db
  .select()
  .from(products)
  .where(and(eq(products.orgId, orgId), eq(products.isActive, true)));
```

```ts
// Insert
await db.insert(products).values({
  name: 'Widget',
  orgId,
  price: 1999,
});
```

```ts
// Transaction
await db.transaction(async (tx) => {
  await tx.update(inventory).set({ quantity: sql`quantity - 1` }).where(...);
  await tx.insert(orderItems).values(...);
});
```

---

## ⚠️ Important Notes

- Drizzle migrations are **forward-only** — they cannot be auto-reversed
- Always run `pnpm db:verify` before deploying to ensure migration integrity
- Use `pnpm db:push` for local prototyping only, never in production
