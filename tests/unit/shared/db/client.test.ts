import { describe, it, expect, vi, beforeEach } from "vitest";

const { warnSpy, capturedOptions, unsafeMock, capturedDrizzleClient } = vi.hoisted(() => ({
  warnSpy: vi.fn(),
  capturedOptions: { current: undefined as Record<string, unknown> | undefined },
  unsafeMock: vi.fn(),
  capturedDrizzleClient: {
    current: undefined as { unsafe: (q: string, p?: unknown[]) => Promise<unknown> } | undefined,
  },
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: (...args: unknown[]) => warnSpy(...args),
    error: vi.fn(),
  },
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn((clientArg: unknown) => {
    capturedDrizzleClient.current = clientArg as {
      unsafe: (q: string, p?: unknown[]) => Promise<unknown>;
    };
    return {};
  }),
}));

vi.mock("postgres", () => {
  return {
    default: vi.fn((url: string, opts: Record<string, unknown>) => {
      capturedOptions.current = opts;
      return {
        options: { parsers: {} },
        unsafe: (...args: unknown[]) => unsafeMock(...args),
      };
    }),
  };
});

describe("shared/db/client security configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOptions.current = undefined;
    delete (globalThis as unknown as { postgresClient?: unknown }).postgresClient;
    vi.resetModules();
  });

  describe("SSL configuration for database connections", () => {
    it("enforces ssl: 'require' on remote connections even in non-production environments", async () => {
      vi.stubEnv(
        "DATABASE_URL",
        "postgres://user:pass@ep-cool-db.us-east-1.aws.neon.tech:5432/neondb",
      );
      vi.stubEnv("NODE_ENV", "development");

      await import("@/shared/db/client");
      expect(capturedOptions.current?.ssl).toBe("require");
    });

    it("allows ssl: false on localhost connections", async () => {
      vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/dilnova");
      vi.stubEnv("NODE_ENV", "development");

      await import("@/shared/db/client");
      expect(capturedOptions.current?.ssl).toBe(false);
    });

    it("allows ssl: false on 127.0.0.1 connections", async () => {
      vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@127.0.0.1:5432/dilnova");
      vi.stubEnv("NODE_ENV", "production");

      await import("@/shared/db/client");
      expect(capturedOptions.current?.ssl).toBe(false);
    });
  });

  describe("Slow query logger parameter redaction", () => {
    it("does not expose raw params array in slow query warnings", async () => {
      vi.stubEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/dilnova");

      unsafeMock.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([{ id: 1 }]), 550);
        });
      });

      await import("@/shared/db/client");

      const client = capturedDrizzleClient.current;
      expect(client).toBeDefined();

      if (client?.unsafe) {
        const sensitiveParams = [
          "Sensitive Customer Name",
          "customer@private-email.com",
          "+1-555-019-2834",
          "742 Evergreen Terrace",
        ];

        await client.unsafe(
          "SELECT * FROM simulated_orders WHERE customer_name = $1 AND customer_email = $2",
          sensitiveParams,
        );

        expect(warnSpy).toHaveBeenCalled();
        const callArgs = warnSpy.mock.calls[0];
        const logPayload = callArgs[1] as Record<string, unknown>;

        // Ensure raw params array is NOT logged
        expect(logPayload).not.toHaveProperty("params");
        // Ensure paramCount is logged instead
        expect(logPayload).toHaveProperty("paramCount", 4);
        // Ensure none of the PII strings leaked in the warning object
        const stringified = JSON.stringify(callArgs);
        expect(stringified).not.toContain("Sensitive Customer Name");
        expect(stringified).not.toContain("customer@private-email.com");
        expect(stringified).not.toContain("+1-555-019-2834");
        expect(stringified).not.toContain("742 Evergreen Terrace");
      }
    });
  });
});
