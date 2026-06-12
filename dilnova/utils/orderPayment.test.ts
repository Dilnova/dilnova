import { describe, expect, it } from 'vitest';
import {
  canFulfillCodOrder,
  canUploadPaymentSlip,
  canVerifyBankTransferPayment,
} from './orderPayment';

describe('orderPayment helpers', () => {
  it('allows slip upload for bank transfer orders awaiting payment', () => {
    expect(
      canUploadPaymentSlip({ paymentMethod: 'bank_transfer', status: 'pending_payment' })
    ).toBe(true);
    expect(
      canUploadPaymentSlip({ paymentMethod: 'bank_transfer', status: 'payment_submitted' })
    ).toBe(true);
    expect(canUploadPaymentSlip({ paymentMethod: 'cash_on_delivery', status: 'pending_payment' })).toBe(
      false
    );
  });

  it('requires submitted slip before vendor verification', () => {
    expect(
      canVerifyBankTransferPayment({
        paymentMethod: 'bank_transfer',
        status: 'payment_submitted',
        paymentSlipUrl: 'https://res.cloudinary.com/demo/image/upload/slip.jpg',
      })
    ).toBe(true);
    expect(
      canVerifyBankTransferPayment({
        paymentMethod: 'bank_transfer',
        status: 'pending_payment',
        paymentSlipUrl: null,
      })
    ).toBe(false);
  });

  it('allows COD fulfillment from pending payment', () => {
    expect(canFulfillCodOrder({ paymentMethod: 'cash_on_delivery', status: 'pending_payment' })).toBe(
      true
    );
    expect(canFulfillCodOrder({ paymentMethod: 'bank_transfer', status: 'pending_payment' })).toBe(false);
  });
});
