import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock DB
const mockInsertValues = vi.fn(() => Promise.resolve());
const mockInsert = vi.fn(() => ({
  values: mockInsertValues,
}));
vi.mock("@/shared/db/client", () => ({
  db: {
    insert: () => mockInsert(),
  },
}));

// Mock SMTP client
const mockSendRawSmtpEmail = vi.fn(() => Promise.resolve());
vi.mock("@/shared/email/smtp-client", () => ({
  escapeHtml: (str: string) => str,
  sanitizeSmtpHeader: (str: string) => str,
  sendRawSmtpEmail: (args: unknown) =>
    mockSendRawSmtpEmail(args as Parameters<typeof mockSendRawSmtpEmail>[0]),
}));

// Mock rate-limit
vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

// Mock settings
vi.mock("@/shared/platform/settings", () => ({
  getSystemSetting: vi.fn((key, def) => Promise.resolve(def)),
}));

import { submitContactFormAction } from "@/features/contact/actions";

describe("submitContactFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASSWORD = "smtp-password";
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("submits successfully when correct parameters are sent", async () => {
    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("email", "john@example.com");
    formData.append("category", "info");
    formData.append("subject", "Test Subject");
    formData.append("message", "Test contact message content of minimum length.");

    const result = await submitContactFormAction(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalled();
    expect(mockSendRawSmtpEmail).toHaveBeenCalled();
  });

  it("silently blocks spam submissions when honeypot field is filled", async () => {
    const formData = new FormData();
    formData.append("name", "Bot Name");
    formData.append("email", "bot@spam.com");
    formData.append("category", "info");
    formData.append("subject", "Spam Subject");
    formData.append("message", "Spam spam spam spam spam spam.");
    formData.append("middleName", "SpammerHoneypotValue"); // Honeypot filled!

    const result = await submitContactFormAction(null, formData);

    // Should return success: true to the bot, but not write to database or send email
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockSendRawSmtpEmail).not.toHaveBeenCalled();
  });

  it("rejects submission when Turnstile is enabled but token is missing", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test_secret";
    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("email", "john@example.com");
    formData.append("category", "info");
    formData.append("subject", "Test Subject");
    formData.append("message", "Test contact message content of minimum length.");

    const result = await submitContactFormAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Please complete the CAPTCHA.");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects submission when Turnstile verification fails", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test_secret";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, "error-codes": ["invalid-input-response"] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("email", "john@example.com");
    formData.append("category", "info");
    formData.append("subject", "Test Subject");
    formData.append("message", "Test contact message content of minimum length.");
    formData.append("cf-turnstile-response", "invalid_token");

    const result = await submitContactFormAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("CAPTCHA verification failed. Please try again.");
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );

    vi.unstubAllGlobals();
  });

  it("submits successfully when Turnstile verification passes", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test_secret";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("email", "john@example.com");
    formData.append("category", "info");
    formData.append("subject", "Test Subject");
    formData.append("message", "Test contact message content of minimum length.");
    formData.append("cf-turnstile-response", "valid_token");

    const result = await submitContactFormAction(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("rejects submission in production environment when TURNSTILE_SECRET_KEY is missing", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.TURNSTILE_SECRET_KEY;

    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("email", "john@example.com");
    formData.append("category", "info");
    formData.append("subject", "Test Subject");
    formData.append("message", "Test contact message content of minimum length.");

    const result = await submitContactFormAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "CAPTCHA verification service is unconfigured. Please try again later.",
    );
    expect(mockInsert).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
