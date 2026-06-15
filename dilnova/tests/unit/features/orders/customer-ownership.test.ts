import { describe, expect, it } from 'vitest';
import {
  buildCustomerOrderAccessWhere,
  customerOwnsOrder,
} from '@/features/orders/customer-ownership';

describe('customerOwnsOrder', () => {
  const boundOrder = {
    customerUserId: 'user_victim',
  };

  it('grants access to the bound Clerk user', () => {
    expect(customerOwnsOrder(boundOrder, 'user_victim')).toBe(true);
  });

  it('denies a different Clerk user', () => {
    expect(customerOwnsOrder(boundOrder, 'user_attacker')).toBe(false);
  });

  it('denies access when the order has no customerUserId', () => {
    expect(customerOwnsOrder({ customerUserId: null }, 'user_guest')).toBe(false);
  });

  it('denies access when the session user id is missing', () => {
    expect(customerOwnsOrder(boundOrder, null)).toBe(false);
  });
});

describe('buildCustomerOrderAccessWhere', () => {
  it('returns a SQL fragment for the Clerk user id', () => {
    expect(buildCustomerOrderAccessWhere('user_1')).toBeTruthy();
  });

  it('returns a false SQL clause when user id is missing', () => {
    const clause = buildCustomerOrderAccessWhere(null);
    expect(clause).toBeTruthy();
    expect(JSON.stringify(clause)).toContain('false');
  });
});
