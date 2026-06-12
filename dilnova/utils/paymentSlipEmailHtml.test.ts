import { describe, expect, it } from 'vitest';
import {
  buildPaymentSlipUploadedEmailHtml,
  buildPaymentVerifiedEmailHtml,
} from './paymentSlipEmailHtml';

describe('paymentSlipEmailHtml', () => {
  it('builds vendor notification email with review link', () => {
    const html = buildPaymentSlipUploadedEmailHtml({
      systemName: 'Dilnova',
      vendorName: 'Acme Store',
      orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      grandTotalCents: 5400,
      vendorConsoleUrl: 'https://example.com/vendor?tab=inventory',
    });

    expect(html).toContain('Payment Slip Uploaded');
    expect(html).toContain('Acme Store');
    expect(html).toContain('jane@example.com');
    expect(html).toContain('https://example.com/vendor?tab=inventory');
    expect(html).toContain('$54.00');
  });

  it('builds customer payment verified email with invoice link', () => {
    const html = buildPaymentVerifiedEmailHtml({
      systemName: 'Dilnova',
      orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      customerName: 'Jane Doe',
      grandTotalCents: 5400,
      paymentLabel: 'Bank Transfer',
      fulfillmentLabel: 'Store Pickup',
      pickupBranchName: 'Main Branch',
      invoiceUrl: 'https://example.com/customer/invoice/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });

    expect(html).toContain('Payment Verified');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Main Branch');
    expect(html).toContain('https://example.com/customer/invoice/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  });
});
