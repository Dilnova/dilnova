import { customType } from 'drizzle-orm/pg-core';
import { encryptString, decryptString } from '@/shared/security/encryption';

export const encryptedText = customType<{ data: string }>({
  dataType() {
    return 'text';
  },
  toDriver(value: unknown): string {
    return encryptString(String(value));
  },
  fromDriver(value: unknown): string {
    return decryptString(typeof value === 'string' ? value : '');
  },
});
