import { describe, it, expect } from "vitest";
// @ts-expect-error importing .mjs script in test
import { parsePostgresUrl } from "../../../scripts/pg-env.mjs";

describe("parsePostgresUrl", () => {
  it("correctly parses a standard PostgreSQL URI into libpq environment variables", () => {
    const url = "postgresql://myuser:mypassword@db.host.internal:5432/production_db";
    const env = parsePostgresUrl(url);

    expect(env).toEqual({
      PGHOST: "db.host.internal",
      PGPORT: "5432",
      PGUSER: "myuser",
      PGPASSWORD: "mypassword",
      PGDATABASE: "production_db",
    });
  });

  it("handles percent-encoded special characters in username and password", () => {
    const url = "postgresql://user%40domain.com:p%40ss%23word%24123@db.supabase.co:6543/prod_db";
    const env = parsePostgresUrl(url);

    expect(env.PGUSER).toBe("user@domain.com");
    expect(env.PGPASSWORD).toBe("p@ss#word$123");
    expect(env.PGHOST).toBe("db.supabase.co");
    expect(env.PGPORT).toBe("6543");
    expect(env.PGDATABASE).toBe("prod_db");
  });

  it("extracts sslmode query parameter when present", () => {
    const url = "postgresql://postgres:password@localhost:5432/testdb?sslmode=require";
    const env = parsePostgresUrl(url);

    expect(env.PGSSLMODE).toBe("require");
  });

  it("defaults port to 5432 when omitted", () => {
    const url = "postgresql://postgres:secret@db.internal/app";
    const env = parsePostgresUrl(url);

    expect(env.PGPORT).toBe("5432");
  });

  it("throws error for empty or invalid URL", () => {
    expect(() => parsePostgresUrl("")).toThrow("PostgreSQL connection URL is required.");
    expect(() => parsePostgresUrl("not-a-valid-url")).toThrow();
  });
});
