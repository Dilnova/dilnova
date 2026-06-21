import { describe, it, expect } from 'vitest';
import { redactSensitiveData } from '@/shared/logging/logger';

describe('Log Redaction Filters', () => {
  it('should redact sensitive key values', () => {
    const payload = {
      username: 'john_doe',
      email: 'john@example.com',
      shippingAddress: '123 Enterprise St.',
      shippingPhone: '555-123-4567',
      bankAccountNumber: '987654321',
      bankDetails: {
        bankName: 'Test Bank',
        bankAccountName: 'John Doe Ltd',
      },
      nonSensitive: 'all-clear',
    };

    const redacted = redactSensitiveData(payload);

    expect(redacted.username).toBe('john_doe');
    expect(redacted.nonSensitive).toBe('all-clear');

    expect(redacted.email).toBe('[REDACTED]');
    expect(redacted.shippingAddress).toBe('[REDACTED]');
    expect(redacted.shippingPhone).toBe('[REDACTED]');
    expect(redacted.bankAccountNumber).toBe('[REDACTED]');
    expect(redacted.bankDetails.bankName).toBe('[REDACTED]');
    expect(redacted.bankDetails.bankAccountName).toBe('[REDACTED]');
  });

  it('should redact emails embedded in strings/error messages', () => {
    const errorMsg = 'Failed to invite user test.user@dilnova.com because they already exist.';
    const redacted = redactSensitiveData(errorMsg);
    expect(redacted).toBe('Failed to invite user [REDACTED_EMAIL] because they already exist.');
  });

  it('should handle circular references without infinite loops', () => {
    const circular: any = {
      name: 'Circular Object',
      email: 'sensitive@dilnova.com',
    };
    circular.self = circular;

    const redacted = redactSensitiveData(circular);
    expect(redacted.email).toBe('[REDACTED]');
    expect(redacted.self).toBe('[Circular]');
  });

  it('should handle arrays correctly', () => {
    const list = [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ];

    const redacted = redactSensitiveData(list);
    expect(redacted[0].name).toBe('Alice');
    expect(redacted[0].email).toBe('[REDACTED]');
    expect(redacted[1].name).toBe('Bob');
    expect(redacted[1].email).toBe('[REDACTED]');
  });
});
