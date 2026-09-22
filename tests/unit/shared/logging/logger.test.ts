import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, redactSensitiveData } from "@/shared/logging/logger";

describe("Log Redaction Filters", () => {
  it("should redact sensitive key values", () => {
    const payload = {
      username: "john_doe",
      email: "john@example.com",
      shippingAddress: "123 Enterprise St.",
      shippingPhone: "555-123-4567",
      bankAccountNumber: "987654321",
      bankDetails: {
        bankName: "Test Bank",
        bankAccountName: "John Doe Ltd",
      },
      apiKey: "secret_live_12345",
      authorization: "Bearer my-token-value",
      password: "SuperSecretPassword123!",
      nonSensitive: "all-clear",
    };

    const redacted = redactSensitiveData(payload);

    expect(redacted.username).toBe("john_doe");
    expect(redacted.nonSensitive).toBe("all-clear");

    expect(redacted.email).toBe("[REDACTED]");
    expect(redacted.shippingAddress).toBe("[REDACTED]");
    expect(redacted.shippingPhone).toBe("[REDACTED]");
    expect(redacted.bankAccountNumber).toBe("[REDACTED]");
    expect(redacted.bankDetails.bankName).toBe("[REDACTED]");
    expect(redacted.bankDetails.bankAccountName).toBe("[REDACTED]");
    expect(redacted.apiKey).toBe("[REDACTED]");
    expect(redacted.authorization).toBe("[REDACTED]");
    expect(redacted.password).toBe("[REDACTED]");
  });

  it("should redact emails embedded in strings/error messages", () => {
    const errorMsg = "Failed to invite user test.user@dilnova.com because they already exist.";
    const redacted = redactSensitiveData(errorMsg);
    expect(redacted).toBe("Failed to invite user [REDACTED_EMAIL] because they already exist.");
  });

  it("should handle circular references without infinite loops", () => {
    const circular: Record<string, unknown> = {
      name: "Circular Object",
      email: "sensitive@dilnova.com",
    };
    circular.self = circular;

    const redacted = redactSensitiveData(circular) as Record<string, unknown>;
    expect(redacted.email).toBe("[REDACTED]");
    expect(redacted.self).toBe("[Circular]");
  });

  it("should handle arrays correctly", () => {
    const list = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ];

    const redacted = redactSensitiveData(list);
    expect(redacted[0].name).toBe("Alice");
    expect(redacted[0].email).toBe("[REDACTED]");
    expect(redacted[1].name).toBe("Bob");
    expect(redacted[1].email).toBe("[REDACTED]");
  });
});

describe("Structured Logger Output & Log Injection Defense", () => {
  const originalEnv = process.env.NODE_ENV;
  let loggedOutput: string[] = [];

  beforeEach(() => {
    loggedOutput = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      loggedOutput.push(msg);
    });
    vi.spyOn(console, "warn").mockImplementation((msg: string) => {
      loggedOutput.push(msg);
    });
    vi.spyOn(console, "error").mockImplementation((msg: string) => {
      loggedOutput.push(msg);
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("sanitizes CRLF characters to prevent Log Injection / Log Splitting attacks", () => {
    process.env.NODE_ENV = "production";

    logger.info("User login attempt\r\n[CRITICAL] Admin privilege granted to attacker\nNew line");

    expect(loggedOutput.length).toBe(1);
    const parsed = JSON.parse(loggedOutput[0]);
    expect(parsed.message).not.toContain("\r");
    expect(parsed.message).not.toContain("\n");
    expect(parsed.message).toBe(
      "User login attempt  [CRITICAL] Admin privilege granted to attacker New line",
    );
  });

  it("emits valid structured JSON with level, message, and timestamp in production", () => {
    process.env.NODE_ENV = "production";

    logger.info("Order processed successfully", {
      orderId: "ord_12345",
      amountCents: 5000,
      customerEmail: "victim@example.com",
    });

    expect(loggedOutput.length).toBe(1);
    const entry = JSON.parse(loggedOutput[0]);
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Order processed successfully");
    expect(entry.timestamp).toBeDefined();
    expect(entry.context.orderId).toBe("ord_12345");
    expect(entry.context.amountCents).toBe(5000);
    // Email in context must be redacted
    expect(entry.context.customerEmail).toBe("[REDACTED]");
  });

  it("redacts sensitive keys from error objects logged via logger.error", () => {
    process.env.NODE_ENV = "production";

    const error = new Error(
      "Failed to process payment for user@example.com with token sk_live_xyz",
    );
    logger.error("Payment failed", error, {
      cardSecret: "4111-2222-3333-4444",
    });

    expect(loggedOutput.length).toBe(1);
    const entry = JSON.parse(loggedOutput[0]);
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("Payment failed");
    expect(entry.error.message).toContain("[REDACTED_EMAIL]");
    expect(entry.context.cardSecret).toBe("[REDACTED]");
  });
});
