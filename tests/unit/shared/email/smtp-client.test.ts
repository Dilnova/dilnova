import { describe, expect, it } from "vitest";
import { sanitizeSmtpHeader, sanitizeSmtpMailbox } from "@/shared/email/smtp-client";

describe("sanitizeSmtpHeader", () => {
  it("removes CR/LF injection characters", () => {
    expect(sanitizeSmtpHeader("Hello\r\nBcc: attacker@evil.com")).toBe(
      "Hello Bcc: attacker@evil.com",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeSmtpHeader("  subject  ")).toBe("subject");
  });
});

describe("sanitizeSmtpMailbox", () => {
  it("accepts a valid mailbox", () => {
    expect(sanitizeSmtpMailbox("buyer@example.com")).toBe("buyer@example.com");
  });

  it("rejects header injection in mailbox", () => {
    expect(() => sanitizeSmtpMailbox("buyer@example.com\r\nBcc: evil@evil.com")).toThrow(
      "Invalid email address.",
    );
  });

  it("rejects malformed mailbox", () => {
    expect(() => sanitizeSmtpMailbox("not-an-email")).toThrow("Invalid email address.");
  });
});
