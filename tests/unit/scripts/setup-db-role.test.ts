import { describe, it, expect } from "vitest";
// @ts-expect-error importing .mjs script in test
import {
  buildRuntimeConnectionString,
  generateRoleSetupSql,
} from "../../../scripts/setup-db-role.mjs";

describe("buildRuntimeConnectionString", () => {
  it("converts a standard connection URL to use the least-privilege role", () => {
    const base = "postgresql://postgres:superSecretPass@localhost:5432/dilnova";
    const res = buildRuntimeConnectionString(base, "dilnova_app", "newSecurePassword123");

    expect(res).toBe("postgresql://dilnova_app:newSecurePassword123@localhost:5432/dilnova");
  });

  it("preserves Supabase pooler username project suffixes", () => {
    const base =
      "postgresql://postgres.abcdefghijklmnop:adminPass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const res = buildRuntimeConnectionString(base, "dilnova_app", "leastPrivPass456");

    expect(res).toBe(
      "postgresql://dilnova_app.abcdefghijklmnop:leastPrivPass456@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
    );
  });

  it("preserves URL query parameters and SSL flags", () => {
    const base =
      "postgresql://postgres:pass@db.example.com:5432/mydb?sslmode=require&application_name=dilnova";
    const res = buildRuntimeConnectionString(base, "dilnova_app", "secret999");

    const parsed = new URL(res);
    expect(parsed.username).toBe("dilnova_app");
    expect(parsed.password).toBe("secret999");
    expect(parsed.searchParams.get("sslmode")).toBe("require");
    expect(parsed.searchParams.get("application_name")).toBe("dilnova");
  });

  it("safely URL-encodes special characters in passwords", () => {
    const base = "postgresql://postgres:pass@localhost:5432/db";
    const res = buildRuntimeConnectionString(base, "dilnova_app", "p@ss#word%123");

    const parsed = new URL(res);
    expect(parsed.username).toBe("dilnova_app");
    expect(decodeURIComponent(parsed.password)).toBe("p@ss#word%123");
  });
});

describe("generateRoleSetupSql", () => {
  it("generates SQL with all required least-privilege constraints and grants", () => {
    const sql = generateRoleSetupSql("dilnova_app", "dummy_pass");

    // 1. Role restrictions
    expect(sql).toContain("CREATE ROLE dilnova_app");
    expect(sql).toContain("NOSUPERUSER");
    expect(sql).toContain("NOCREATEDB");
    expect(sql).toContain("NOCREATEROLE");
    expect(sql).toContain("NOREPLICATION");
    expect(sql).toContain("NOBYPASSRLS");

    // 2. DDL prevention
    expect(sql).toContain("REVOKE CREATE ON SCHEMA public FROM dilnova_app;");

    // 3. Schema and DML privileges
    expect(sql).toContain("GRANT USAGE ON SCHEMA public TO dilnova_app;");
    expect(sql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dilnova_app;",
    );

    // 4. Sequences (required for serial/identity primary keys)
    expect(sql).toContain("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dilnova_app;");

    // 5. Functions
    expect(sql).toContain("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO dilnova_app;");

    // 6. Default privileges for future migrations
    expect(sql).toContain(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dilnova_app;",
    );
    expect(sql).toContain(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO dilnova_app;",
    );
    expect(sql).toContain(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO dilnova_app;",
    );
  });
});
