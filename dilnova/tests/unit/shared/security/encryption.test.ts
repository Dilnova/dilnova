import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Must mock 'server-only' before importing the module
vi.mock('server-only', () => ({}));

import { encryptString, decryptString } from '@/shared/security/encryption';

describe('Encryption Utilities', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return cleartext in dev/test if PII_ENCRYPTION_KEY is not defined', () => {
    delete process.env.PII_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'test';
    const rawText = 'test-customer-name';
    const encrypted = encryptString(rawText);
    expect(encrypted).toBe(rawText);

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(rawText);
  });

  it('should throw in production if PII_ENCRYPTION_KEY is not defined', () => {
    delete process.env.PII_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production';

    expect(() => encryptString('sensitive-data')).toThrowError(
      /PII_ENCRYPTION_KEY is not configured/
    );

    expect(() => decryptString('some-ciphertext')).toThrowError(
      /PII_ENCRYPTION_KEY is not configured/
    );
  });

  it('should encrypt and decrypt a string when PII_ENCRYPTION_KEY is set', () => {
    process.env.PII_ENCRYPTION_KEY = 'super-secret-key-123456789012345';
    const rawText = 'Sensitive customer message here.';
    
    const encrypted = encryptString(rawText);
    expect(encrypted).not.toBe(rawText);
    expect(encrypted).toContain(':'); // Ensure iv:encrypted:tag format
    
    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(rawText);
  });

  it('should return input string if decryptString is called with malformed formatted ciphertext', () => {
    process.env.PII_ENCRYPTION_KEY = 'super-secret-key-123456789012345';
    const malformed = 'malformedciphertext';
    const decrypted = decryptString(malformed);
    expect(decrypted).toBe(malformed);
  });

  it('should return input string in dev/test if decryption fails due to incorrect key', () => {
    process.env.NODE_ENV = 'test';
    process.env.PII_ENCRYPTION_KEY = 'key-one';
    const encrypted = encryptString('hello-world');
    
    // Change key to simulate decrypting with the wrong key
    process.env.PII_ENCRYPTION_KEY = 'key-two';
    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(encrypted);
  });

  it('should throw in production if decryption fails due to incorrect key', () => {
    process.env.PII_ENCRYPTION_KEY = 'key-one';
    const encrypted = encryptString('hello-world');
    
    process.env.NODE_ENV = 'production';
    process.env.PII_ENCRYPTION_KEY = 'key-two';
    expect(() => decryptString(encrypted)).toThrowError(/Decryption failed/);
  });
});

