import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";

// Must mock 'server-only' before importing the module
vi.mock("server-only", () => ({}));

import { encryptString, decryptString } from "@/shared/security/encryption";

describe("Encryption Utilities", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return cleartext in dev/test if PII_ENCRYPTION_KEY is not defined", () => {
    delete process.env.PII_ENCRYPTION_KEY;
    process.env.NODE_ENV = "test";
    const rawText = "test-customer-name";
    const encrypted = encryptString(rawText);
    expect(encrypted).toBe(rawText);

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(rawText);
  });

  it("should throw in production if PII_ENCRYPTION_KEY is not defined", () => {
    delete process.env.PII_ENCRYPTION_KEY;
    process.env.NODE_ENV = "production";

    expect(() => encryptString("sensitive-data")).toThrowError(
      /PII_ENCRYPTION_KEY is not configured/,
    );

    expect(() => decryptString("some-ciphertext")).toThrowError(
      /PII_ENCRYPTION_KEY is not configured/,
    );
  });

  it("should encrypt and decrypt a string when PII_ENCRYPTION_KEY is set", () => {
    process.env.PII_ENCRYPTION_KEY = "super-secret-key-123456789012345";
    const rawText = "Sensitive customer message here.";

    const encrypted = encryptString(rawText);
    expect(encrypted).not.toBe(rawText);
    expect(encrypted).toContain(":"); // Ensure iv:encrypted:tag format

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(rawText);
  });

  it("should support backward compatibility by decrypting legacy unversioned (v0) ciphertext", () => {
    const key = "super-secret-key-123456789012345";
    process.env.PII_ENCRYPTION_KEY = key;
    const rawText = "Legacy plaintext secret data.";

    // Manually encrypt using the old v0 method: SHA-256 derived key, iv:encrypted:tag (no v1: prefix)
    const hashedKey = crypto.createHash("sha256").update(key).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", hashedKey, iv);
    const encrypted = Buffer.concat([cipher.update(rawText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const legacyCiphertext = `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;

    // Verify it is recognized as legacy (has no v1: prefix)
    expect(legacyCiphertext.startsWith("v1:")).toBe(false);

    // Verify decryptString successfully decrypts it
    const decrypted = decryptString(legacyCiphertext);
    expect(decrypted).toBe(rawText);
  });

  it("should prefix newly encrypted ciphertext with v2:", () => {
    process.env.PII_ENCRYPTION_KEY = "super-secret-key-123456789012345";
    const rawText = "Fresh plaintext data to encrypt.";

    const encrypted = encryptString(rawText);
    expect(encrypted.startsWith("v2:")).toBe(true);

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(rawText);
  });

  it("should decrypt v1 ciphertext using fallback PII_ENCRYPTION_KEY_V1 key", () => {
    const oldKey = "old-key-v1-super-secret-12345";
    const newKey = "new-key-v2-super-secret-67890";

    process.env.PII_ENCRYPTION_KEY = oldKey;
    const rawText = "V1 encrypted data.";

    // Manually encrypt with v1 (using old HKDF salt 'dilnova-pii-v1')
    const keyArrayBuffer = crypto.hkdfSync("sha256", oldKey, "dilnova-pii-v1", "aes-256-gcm", 32);
    const hashedKey = Buffer.from(keyArrayBuffer);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", hashedKey, iv);
    const encrypted = Buffer.concat([cipher.update(rawText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const v1Ciphertext = `v1:${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;

    // Set new key as active, and old key as fallback
    process.env.PII_ENCRYPTION_KEY = newKey;
    process.env.PII_ENCRYPTION_KEY_V1 = oldKey;

    const decrypted = decryptString(v1Ciphertext);
    expect(decrypted).toBe(rawText);
  });

  it("should return input string if decryptString is called with malformed formatted ciphertext", () => {
    process.env.PII_ENCRYPTION_KEY = "super-secret-key-123456789012345";
    const malformed = "malformedciphertext";
    const decrypted = decryptString(malformed);
    expect(decrypted).toBe(malformed);
  });

  it("should return input string in dev/test if decryption fails due to incorrect key", () => {
    process.env.NODE_ENV = "test";
    process.env.PII_ENCRYPTION_KEY = "key-one";
    const encrypted = encryptString("hello-world");

    // Change key to simulate decrypting with the wrong key
    process.env.PII_ENCRYPTION_KEY = "key-two";
    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(encrypted);
  });

  it("should return [Decryption Failed] in production if decryption fails due to incorrect key", () => {
    process.env.PII_ENCRYPTION_KEY = "key-one";
    const encrypted = encryptString("hello-world");

    process.env.NODE_ENV = "production";
    process.env.PII_ENCRYPTION_KEY = "key-two";
    expect(decryptString(encrypted)).toBe("[Decryption Failed]");
  });
});
