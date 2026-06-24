import { logger } from '@/shared/logging/logger';
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Encrypts a cleartext string using AES-256-GCM.
 *
 * In production, throws if PII_ENCRYPTION_KEY is not configured or if
 * encryption fails — PII must never be silently stored in cleartext.
 * In development/test, falls back to returning cleartext when the key is absent
 * so local workflows are not disrupted.
 */
export function encryptString(text: string): string {
  if (!text) return text;
  
  const key = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!key) {
    if (isProduction()) {
      throw new Error(
        'PII_ENCRYPTION_KEY is not configured. Cannot store sensitive data without encryption in production.'
      );
    }
    return text;
  }

  try {
    // Derive secure 32-byte key using HKDF for version 2 (v2)
    const keyArrayBuffer = crypto.hkdfSync('sha256', key, 'dilnova-pii-v2', 'aes-256-gcm', 32);
    const hashedKey = Buffer.from(keyArrayBuffer);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, hashedKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    // Package with "v2" prefix
    return `v2:${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
  } catch (error) {
    if (isProduction()) {
      throw new Error('Encryption failed. Refusing to store PII in cleartext.');
    }
    logger.error('Encryption failed, returning cleartext:', error);
    return text;
  }
}

/**
 * Decrypts a ciphertext string created by encryptString.
 * Supports v2, v1, and legacy unversioned decryptions using key fallback.
 *
 * In production, throws if appropriate key is not configured.
 * In development/test, falls back to returning the input string when keys are absent.
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  const key = process.env.PII_ENCRYPTION_KEY?.trim();
  const fallbackKeyV1 = process.env.PII_ENCRYPTION_KEY_V1?.trim();

  if (!key) {
    if (isProduction()) {
      throw new Error(
        'PII_ENCRYPTION_KEY is not configured. Cannot decrypt sensitive data in production.'
      );
    }
    return encryptedText;
  }

  const isV2 = encryptedText.startsWith('v2:');
  const isV1 = encryptedText.startsWith('v1:');

  try {
    if (isV2) {
      const parts = encryptedText.split(':');
      if (parts.length !== 4) {
        return encryptedText;
      }
      const [, ivHex, encryptedHex, tagHex] = parts;
      const keyArrayBuffer = crypto.hkdfSync('sha256', key, 'dilnova-pii-v2', 'aes-256-gcm', 32);
      const hashedKey = Buffer.from(keyArrayBuffer);
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, hashedKey, iv);
      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8');
    } else if (isV1) {
      const parts = encryptedText.split(':');
      if (parts.length !== 4) {
        return encryptedText;
      }
      const [, ivHex, encryptedHex, tagHex] = parts;
      
      // Use fallback v1 key if configured, otherwise fall back to primary key
      const decryptionKey = fallbackKeyV1 || key;
      const keyArrayBuffer = crypto.hkdfSync('sha256', decryptionKey, 'dilnova-pii-v1', 'aes-256-gcm', 32);
      const hashedKey = Buffer.from(keyArrayBuffer);
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, hashedKey, iv);
      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8');
    } else {
      // Legacy unversioned (v0) decryption
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        return encryptedText;
      }
      const [ivHex, encryptedHex, tagHex] = parts;

      // Use fallback v1 key if configured, otherwise fall back to primary key
      const decryptionKey = fallbackKeyV1 || key;
      const hashedKey = crypto.createHash('sha256').update(decryptionKey).digest();
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, hashedKey, iv);
      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8');
    }
  } catch (error) {
    if (isProduction()) {
      throw new Error('Decryption failed. The PII_ENCRYPTION_KEY may have changed or the data is corrupted.');
    }
    return encryptedText;
  }
}
