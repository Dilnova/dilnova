import 'server-only';
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

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
    // Generate a cryptographically strong 32-byte key from the configured key using SHA-256
    const hashedKey = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, hashedKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    // Return packaged IV, cipher, and Auth tag separated by colons
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
  } catch (error) {
    if (isProduction()) {
      throw new Error('Encryption failed. Refusing to store PII in cleartext.');
    }
    console.error('Encryption failed, returning cleartext:', error);
    return text;
  }
}

/**
 * Decrypts a ciphertext string created by encryptString.
 *
 * In production, throws if PII_ENCRYPTION_KEY is not configured.
 * In development/test, falls back to returning the input string when the key
 * is absent so local workflows are not disrupted.
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  const key = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!key) {
    if (isProduction()) {
      throw new Error(
        'PII_ENCRYPTION_KEY is not configured. Cannot decrypt sensitive data in production.'
      );
    }
    return encryptedText;
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Return unchanged if it doesn't match iv:encrypted:tag format
    return encryptedText;
  }

  try {
    const [ivHex, encryptedHex, tagHex] = parts;
    const hashedKey = crypto.createHash('sha256').update(key).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, hashedKey, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  } catch (error) {
    if (isProduction()) {
      throw new Error('Decryption failed. The PII_ENCRYPTION_KEY may have changed or the data is corrupted.');
    }
    // In dev/test: return the encrypted string unchanged to avoid breaking local workflows
    return encryptedText;
  }
}
