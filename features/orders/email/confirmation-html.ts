import { type BankTransferCheckoutInstructions } from "@/features/billing/bank-transfer";
import { escapeHtml } from "@/shared/email/smtp-client";

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function buildOrderConfirmationEmailHtml(input: {
  systemName: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  fulfillmentLabel: string;
  paymentLabel: string;
  pickupBranchName?: string | null;
  shippingAddress?: string | null;
  shippingPhone?: string | null;
  items: { productName: string; quantity: number; unitPrice: number }[];
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
  bankTransferInstructions?: BankTransferCheckoutInstructions;
  isSignedIn: boolean;
  appUrl: string;
}): string {
  const {
    systemName,
    orderId,
    customerName,
    customerEmail,
    fulfillmentLabel,
    paymentLabel,
    pickupBranchName,
    shippingAddress,
    shippingPhone,
    items,
    subtotalAmount,
    taxAmount,
    shippingAmount,
    grandTotal,
    bankTransferInstructions,
    isSignedIn,
    appUrl,
  } = input;

  const systemNameHub = `${systemName} Commerce Hub`;
  const orderRef = orderId.slice(0, 8).toUpperCase();
  const isBankTransfer = Boolean(bankTransferInstructions);

  const itemsHtml = items
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #e4e4e7;">
          <td style="padding: 12px 8px; font-size: 14px; color: #18181b;">
            <strong style="display: block;">${escapeHtml(item.productName)}</strong>
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #52525b; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; color: #52525b; text-align: right;">
            ${formatPrice(item.unitPrice)}
          </td>
          <td style="padding: 12px 8px; font-size: 14px; font-family: monospace; font-weight: bold; color: #18181b; text-align: right;">
            ${formatPrice(item.unitPrice * item.quantity)}
          </td>
        </tr>
      `,
    )
    .join("");

  const bankTransferHtml = bankTransferInstructions
    ? `
      <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;">Bank Transfer Instructions</h3>
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #78350f; line-height: 1.5;">
          Transfer the total amount below and include the payment reference in your transfer description.
          Your order will be prepared after payment is verified.
        </p>
        <table style="width: 100%; font-size: 12px; color: #78350f; margin-bottom: 12px;">
          <tr>
            <td style="padding: 4px 0;">Payment reference</td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: bold;">
              ${escapeHtml(bankTransferInstructions.reference)}
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0;">Amount to transfer</td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: bold;">
              ${formatPrice(bankTransferInstructions.grandTotalCents)}
            </td>
          </tr>
        </table>
        ${bankTransferInstructions.vendors
          .map((vendor) => {
            if (!vendor.bankDetails) {
              return `<p style="font-size: 12px; color: #b45309; margin: 8px 0;">${escapeHtml(vendor.vendorName)}: contact the store for bank details.</p>`;
            }
            return `
              <div style="background-color: #ffffff; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #78350f;">
                  ${escapeHtml(vendor.vendorName)}${bankTransferInstructions.vendors.length > 1 ? ` — ${formatPrice(vendor.amountCents)}` : ""}
                </p>
                <p style="margin: 0; font-size: 11px; color: #92400e; line-height: 1.6; font-family: monospace;">
                  Bank: ${escapeHtml(vendor.bankDetails.bankName)}<br/>
                  Account name: ${escapeHtml(vendor.bankDetails.accountName)}<br/>
                  Account number: ${escapeHtml(vendor.bankDetails.accountNumber)}
                  ${vendor.bankDetails.branchCode ? `<br/>Branch / sort code: ${escapeHtml(vendor.bankDetails.branchCode)}` : ""}
                  ${vendor.bankDetails.instructions ? `<br/><span style="font-family: inherit;">${escapeHtml(vendor.bankDetails.instructions)}</span>` : ""}
                </p>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const ctaUrl = isSignedIn ? `${appUrl}/customer/invoice/${orderId}` : `${appUrl}/customer`;
  const ctaLabel = isSignedIn ? "View Invoice" : "Sign In to Track Order";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation | ${escapeHtml(systemName)}</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #18181b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #6b21a8; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px;">
              ${escapeHtml(systemNameHub.toUpperCase())}
            </h1>
            <p style="margin: 4px 0 0 0; color: #e9d5ff; font-size: 12px;">
              ${isBankTransfer ? "Order Received — Awaiting Payment" : "Order Confirmation"}
            </p>
          </div>

          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #52525b; line-height: 1.5; margin-bottom: 16px;">
              Hello ${escapeHtml(customerName)},<br/>
              ${
                isBankTransfer
                  ? "Thank you for your order. Please complete your bank transfer using the instructions below."
                  : "Thank you for your order. Here is your order summary."
              }
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 12px; color: #475569;">
              <p style="margin: 0 0 6px 0;"><strong>Order ID:</strong> ${orderRef}</p>
              <p style="margin: 0 0 6px 0;"><strong>Fulfillment:</strong> ${escapeHtml(fulfillmentLabel)}</p>
              <p style="margin: 0 0 6px 0;"><strong>Payment:</strong> ${escapeHtml(paymentLabel)}</p>
              ${pickupBranchName ? `<p style="margin: 0 0 6px 0;"><strong>Pickup branch:</strong> ${escapeHtml(pickupBranchName)}</p>` : ""}
              ${shippingAddress ? `<p style="margin: 0 0 6px 0;"><strong>Delivery address:</strong> ${escapeHtml(shippingAddress).replace(/\n/g, "<br/>")}</p>` : ""}
              ${shippingPhone ? `<p style="margin: 0;"><strong>Delivery phone:</strong> ${escapeHtml(shippingPhone)}</p>` : ""}
            </div>

            ${bankTransferHtml}

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="border-bottom: 2px solid #e4e4e7; text-align: left;">
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase;">Item</th>
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: center;">Qty</th>
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: right;">Price</th>
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 13px; color: #475569;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(subtotalAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Estimated Tax (8%)</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(taxAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Shipping</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace;">${shippingAmount === 0 ? "FREE" : formatPrice(shippingAmount)}</td>
                </tr>
                <tr style="font-weight: bold; color: #0f172a; font-size: 15px; border-top: 1px dashed #cbd5e1;">
                  <td style="padding: 12px 0 0 0;">Total</td>
                  <td style="padding: 12px 0 0 0; text-align: right; font-family: monospace; font-size: 16px;">${formatPrice(grandTotal)}</td>
                </tr>
              </table>
            </div>

            ${
              !isSignedIn
                ? `<p style="font-size: 12px; color: #71717a; line-height: 1.5; margin-bottom: 24px;">
                    Sign in with this email address (<strong>${escapeHtml(customerEmail)}</strong>) to view your order history and invoice.
                  </p>`
                : ""
            }

            <div style="text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; background-color: #6b21a8; color: #ffffff; font-size: 12px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                ${ctaLabel}
              </a>
            </div>
          </div>

          <div style="background-color: #f4f4f5; padding: 24px 16px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 11px; color: #71717a; line-height: 1.6;">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #3f3f46; font-size: 12px;">${escapeHtml(systemNameHub)}</p>
            <p style="margin: 0 0 4px 0;">123 Commerce Avenue, Suite 400<br/>Colombo, 00100, Sri Lanka</p>
            <p style="margin: 0 0 12px 0;">Registration No. PV-123456</p>
            <p style="margin: 0; color: #a1a1aa;">&copy; ${new Date().getFullYear()} ${escapeHtml(systemName)}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
