import { escapeHtml } from "@/shared/email/smtp-client";

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function buildPaymentSlipUploadedEmailHtml(input: {
  systemName: string;
  vendorName: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  grandTotalCents: number;
  vendorConsoleUrl: string;
}): string {
  const orderRef = input.orderId.slice(0, 8).toUpperCase();

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7;">
        <div style="background: #7e22ce; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85;">${escapeHtml(input.systemName)}</p>
          <h1 style="margin: 8px 0 0 0; font-size: 20px;">Payment Slip Uploaded</h1>
        </div>
        <div style="padding: 24px; color: #27272a;">
          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
            A customer uploaded a bank payment slip for order <strong>#${orderRef}</strong> at <strong>${escapeHtml(input.vendorName)}</strong>.
            Please review and verify the payment in your vendor console.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Customer</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(input.customerName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Email</td>
              <td style="padding: 8px 0; text-align: right;">${escapeHtml(input.customerEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Order total</td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700;">${formatPrice(input.grandTotalCents)}</td>
            </tr>
          </table>
          <a href="${escapeHtml(input.vendorConsoleUrl)}" style="display: inline-block; background: #7e22ce; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;">
            Review Order in Vendor Console
          </a>
        </div>
      </div>
    </div>
  `;
}

export function buildPaymentVerifiedEmailHtml(input: {
  systemName: string;
  orderId: string;
  customerName: string;
  grandTotalCents: number;
  paymentLabel: string;
  fulfillmentLabel: string;
  pickupBranchName?: string | null;
  invoiceUrl: string;
  headline?: string;
  introText?: string;
}): string {
  const orderRef = input.orderId.slice(0, 8).toUpperCase();
  const headline = input.headline || "Payment Verified";
  const introText =
    input.introText ||
    `Hi ${escapeHtml(input.customerName)}, your payment for order <strong>#${orderRef}</strong> has been verified. Your order is now being processed for fulfillment.`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7;">
        <div style="background: #059669; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85;">${escapeHtml(input.systemName)}</p>
          <h1 style="margin: 8px 0 0 0; font-size: 20px;">${escapeHtml(headline)}</h1>
        </div>
        <div style="padding: 24px; color: #27272a;">
          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
            ${introText}
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Payment method</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(input.paymentLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Fulfillment</td>
              <td style="padding: 8px 0; text-align: right;">${escapeHtml(input.fulfillmentLabel)}</td>
            </tr>
            ${
              input.pickupBranchName
                ? `<tr>
              <td style="padding: 8px 0; color: #71717a;">Pickup branch</td>
              <td style="padding: 8px 0; text-align: right;">${escapeHtml(input.pickupBranchName)}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Total paid</td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700;">${formatPrice(input.grandTotalCents)}</td>
            </tr>
          </table>
          <a href="${escapeHtml(input.invoiceUrl)}" style="display: inline-block; background: #7e22ce; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;">
            View Invoice
          </a>
        </div>
      </div>
    </div>
  `;
}

export function buildOrderCancelledEmailHtml(input: {
  systemName: string;
  orderId: string;
  customerName: string;
  grandTotalCents: number;
  invoiceUrl: string;
}): string {
  const orderRef = input.orderId.slice(0, 8).toUpperCase();

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7;">
        <div style="background: #be123c; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85;">${escapeHtml(input.systemName)}</p>
          <h1 style="margin: 8px 0 0 0; font-size: 20px;">Order Cancelled</h1>
        </div>
        <div style="padding: 24px; color: #27272a;">
          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
            Hi ${escapeHtml(input.customerName)}, your order <strong>#${orderRef}</strong> has been cancelled.
            Any reserved stock has been released. If you already paid, please contact the vendor for refund assistance.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Order total</td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700;">${formatPrice(input.grandTotalCents)}</td>
            </tr>
          </table>
          <a href="${escapeHtml(input.invoiceUrl)}" style="display: inline-block; background: #7e22ce; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;">
            View Order Details
          </a>
        </div>
      </div>
    </div>
  `;
}

export function buildPaymentSlipRejectedEmailHtml(input: {
  systemName: string;
  orderId: string;
  customerName: string;
  grandTotalCents: number;
  reason?: string | null;
  invoiceUrl: string;
}): string {
  const orderRef = input.orderId.slice(0, 8).toUpperCase();

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7;">
        <div style="background: #d97706; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85;">${escapeHtml(input.systemName)}</p>
          <h1 style="margin: 8px 0 0 0; font-size: 20px;">Payment Slip Needs Attention</h1>
        </div>
        <div style="padding: 24px; color: #27272a;">
          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
            Hi ${escapeHtml(input.customerName)}, the vendor could not verify the payment slip for order <strong>#${orderRef}</strong>.
            Please upload a corrected slip or contact the vendor if you believe this is a mistake.
          </p>
          ${
            input.reason
              ? `<p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 12px; color: #92400e;"><strong>Vendor note:</strong> ${escapeHtml(input.reason)}</p>`
              : ""
          }
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Order total</td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700;">${formatPrice(input.grandTotalCents)}</td>
            </tr>
          </table>
          <a href="${escapeHtml(input.invoiceUrl)}" style="display: inline-block; background: #7e22ce; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;">
            Upload a New Payment Slip
          </a>
        </div>
      </div>
    </div>
  `;
}
