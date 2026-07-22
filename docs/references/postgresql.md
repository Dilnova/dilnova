# PostgreSQL — Official Reference

> **Managed by**: Supabase
> **Official docs**: https://www.postgresql.org/docs/

---

## Key Docs Links

| Topic              | URL                                                                |
| ------------------ | ------------------------------------------------------------------ |
| SQL Commands       | https://www.postgresql.org/docs/current/sql-commands.html          |
| Data Types         | https://www.postgresql.org/docs/current/datatype.html              |
| Indexes            | https://www.postgresql.org/docs/current/indexes.html               |
| Constraints        | https://www.postgresql.org/docs/current/ddl-constraints.html       |
| Transactions       | https://www.postgresql.org/docs/current/tutorial-transactions.html |
| JSON Functions     | https://www.postgresql.org/docs/current/functions-json.html        |
| Full-Text Search   | https://www.postgresql.org/docs/current/textsearch.html            |
| Row Level Security | https://www.postgresql.org/docs/current/ddl-rowsecurity.html       |
| Performance Tips   | https://www.postgresql.org/docs/current/performance-tips.html      |
| EXPLAIN            | https://www.postgresql.org/docs/current/sql-explain.html           |

---

## Dilnova Database Notes

- Schema managed by **Drizzle ORM** (`db/schema.ts`)
- Migrations in `drizzle/` directory
- PII fields encrypted with **AES-256-GCM** (see `PII_ENCRYPTION_KEY`)
- All queries scoped by `orgId` for tenant isolation
- RLS is **not currently enabled** — isolation is enforced at the application layer
