import { describe, expect, it } from 'vitest';
import { buildOrderConfirmationEmailHtml } from '@/features/orders/email/confirmation-html';

describe('buildOrderConfirmationEmailHtml', () => {
  it('includes bank transfer reference and account details when provided', () => {
    const html = buildOrderConfirmationEmailHtml({
      systemName: 'Dilnova',
      orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      fulfillmentLabel: 'Store Pickup',
      paymentLabel: 'Bank Transfer',
      pickupBranchName: 'Main Branch',
      items: [{ productName: 'Widget', quantity: 2, unitPrice: 1500 }],
      subtotalAmount: 3000,
      taxAmount: 240,
      shippingAmount: 0,
      grandTotal: 3240,
      bankTransferInstructions: {
        orderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        reference: 'ORD-A0EEBC999C0B',
        grandTotalCents: 3240,
        vendors: [
          {
            orgId: 'org_1',
            vendorName: 'Acme Store',
            amountCents: 3240,
            bankDetails: {
              bankName: 'Commercial Bank',
              accountName: 'Acme Store Ltd',
              accountNumber: '1234567890',
              branchCode: '001',
              instructions: 'Use the order reference in your transfer.',
            },
          },
        ],
      },
      isSignedIn: false,
      appUrl: 'https://example.com',
    });

    expect(html).toContain('ORD-A0EEBC999C0B');
    expect(html).toContain('Commercial Bank');
    expect(html).toContain('1234567890');
    expect(html).toContain('Main Branch');
    expect(html).toContain('jane@example.com');
    expect(html).toContain('Awaiting Payment');
  });
});
