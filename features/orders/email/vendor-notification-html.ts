import { escapeHtml } from '@/shared/email/smtp-client';

export interface VendorNewOrderEmailInput {
  systemName: string;
  orderId: string;
  customerName: string;
  fulfillmentLabel: string;
  paymentLabel: string;
  vendorConsoleUrl: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'LKR',
  }).format(cents / 100);
}

export function buildVendorNewOrderEmailHtml(input: VendorNewOrderEmailInput): string {
  const itemsHtml = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">
            <div style="font-weight: 500;">${escapeHtml(item.productName)}</div>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; text-align: right; font-weight: 500;">
            ${formatPrice(item.unitPrice * item.quantity)}
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New Order Received</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #18181b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <div style="background-color: #6b21a8; padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
              New Order Received
            </h1>
            <p style="margin: 8px 0 0 0; color: #e9d5ff; font-size: 14px;">
              Order #${escapeHtml(input.orderId.slice(0, 8).toUpperCase())}
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px;">
            <p style="font-size: 15px; line-height: 1.6; color: #3f3f46; margin: 0 0 24px 0;">
              Hello,<br><br>
              A new order has been placed by <strong>${escapeHtml(input.customerName)}</strong>. 
              Please review and process this order as soon as possible.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #71717a; width: 140px; font-weight: 500;">Fulfillment:</td>
                  <td style="padding: 6px 0; color: #18181b; font-weight: 600;">${escapeHtml(input.fulfillmentLabel)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #71717a; width: 140px; font-weight: 500;">Payment:</td>
                  <td style="padding: 6px 0; color: #18181b; font-weight: 600;">${escapeHtml(input.paymentLabel)}</td>
                </tr>
              </table>
            </div>

            <h2 style="font-size: 16px; color: #18181b; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #f4f4f5;">Order Items</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 32px;">
              <thead>
                <tr>
                  <th style="padding: 12px 0; border-bottom: 2px solid #e4e4e7; color: #71717a; text-align: left; font-weight: 500;">Product</th>
                  <th style="padding: 12px 0; border-bottom: 2px solid #e4e4e7; color: #71717a; text-align: center; font-weight: 500; width: 60px;">Qty</th>
                  <th style="padding: 12px 0; border-bottom: 2px solid #e4e4e7; color: #71717a; text-align: right; font-weight: 500; width: 100px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="text-align: center; margin-top: 40px;">
              <a href="${escapeHtml(input.vendorConsoleUrl)}" style="display: inline-block; background-color: #7e22ce; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(126, 34, 206, 0.2);">
                View Order in Vendor Console
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f4f4f5; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
              ${escapeHtml(input.systemName)} &copy; ${new Date().getFullYear()}. All rights reserved.<br>
              This is an automated notification.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
