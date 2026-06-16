import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Encrypts a cleartext string using AES-256-GCM.
 * Falls back to returning cleartext if PII_ENCRYPTION_KEY is not defined.
 */
export function encryptString(text: string): string {
  if (!text) return text;
  
  const key = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!key) {
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
    console.error('Encryption failed, returning cleartext:', error);
    return text;
  }
}

/**
 * Decrypts a ciphertext string created by encryptString.
 * Falls back to returning the input string if PII_ENCRYPTION_KEY is missing,
 * or if the text is not formatted as an encrypted package.
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  const key = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!key) {
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
    // If decryption fails (e.g. key mismatch or corrupted text), return the encrypted string
    return encryptedText;
  }
}
