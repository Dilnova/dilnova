import { getSystemSetting } from "@/shared/platform/settings";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { inArray } from "drizzle-orm";
import { calculateCheckoutTotals } from "@/features/billing/checkout-totals";
import { escapeHtml, sendRawSmtpEmail } from "@/shared/email/smtp-client";
import { logger } from "@/shared/logging/logger";
import type { CartLineInput } from "@/features/cart/schema";

export async function sendCartSummaryEmailService(
  validatedItems: CartLineInput[],
  validatedEmail: string,
  zeroShipping: boolean,
) {
  const systemName = await getSystemSetting("system_name", "Dilnova");
  const systemNameHub = `${systemName} Commerce Hub`;

  const smtpHost = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || "info@dilstar.pp.ua";
  const emailFromName = process.env.EMAIL_FROM_NAME || `${systemName} Hub`;

  if (!smtpUser || !smtpPassword) {
    logger.error("SMTP credentials (SMTP_USER/SMTP_PASSWORD) are missing");
    return { success: false, error: "SMTP configuration is incomplete on the server." };
  }

  const uniqueItemIds = [...new Set(validatedItems.map((item) => item.id))];
  const products =
    uniqueItemIds.length > 0
      ? await db
          .select({
            id: schema.products.id,
            price: schema.products.price,
            name: schema.products.name,
          })
          .from(schema.products)
          .where(inArray(schema.products.id, uniqueItemIds))
      : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const pricedItems = validatedItems.map((item) => {
    const product = productMap.get(item.id);
    return {
      ...item,
      name: product?.name || item.name,
      price: product?.price ?? item.price,
    };
  });
  const syncedSubtotal = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const {
    taxAmount: estimatedTax,
    shippingAmount: shippingFee,
    grandTotal,
  } = calculateCheckoutTotals(syncedSubtotal, zeroShipping);

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  // Construct beautiful HTML items rows
  const itemsHtml = pricedItems
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e4e4e7;">
        <td style="padding: 12px 8px; font-size: 14px; color: #18181b;">
          <strong style="display: block;">${escapeHtml(item.name)}</strong>
          <span style="font-size: 11px; color: #71717a;">Sold by ${escapeHtml(item.vendorName)}</span>
        </td>
        <td style="padding: 12px 8px; font-size: 13px; color: #52525b; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; color: #52525b; text-align: right;">
          ${formatPrice(item.price)}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; font-family: monospace; font-weight: bold; color: #18181b; text-align: right;">
          ${formatPrice(item.price * item.quantity)}
        </td>
      </tr>
    `,
    )
    .join("");

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your ${systemName} Shopping Cart Summary</title>
      </head>
        <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #18181b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header banner -->
          <div style="background-color: #6b21a8; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px; font-family: inherit;">
              ${systemNameHub.toUpperCase()}
            </h1>
            <p style="margin: 4px 0 0 0; color: #e9d5ff; font-size: 12px;">Your Saved Shopping Cart</p>
          </div>

          <!-- Content Area -->
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #52525b; line-height: 1.5; margin-bottom: 24px;">
              Hello, <br/>
              We saved your cart summary. Here is a breakdown of your selected products and services:
            </p>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="border-bottom: 2px solid #e4e4e7; text-align: left;">
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase;">Item</th>
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: center;">Qty</th>
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: right;">Price</th>
                  <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Order Summary Block -->
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 13px; color: #475569;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(syncedSubtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Estimated Tax (8%)</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(estimatedTax)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Shipping</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace;">${shippingFee === 0 ? "FREE" : formatPrice(shippingFee)}</td>
                </tr>
                <tr style="font-weight: bold; color: #0f172a; font-size: 15px; border-top: 1px dashed #cbd5e1;">
                  <td style="padding: 12px 0 0 0;">Total</td>
                  <td style="padding: 12px 0 0 0; text-align: right; font-family: monospace; font-size: 16px;">${formatPrice(grandTotal)}</td>
                </tr>
              </table>
            </div>

            <!-- Footer Buttons -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL}/cart" style="display: inline-block; background-color: #6b21a8; color: #ffffff; font-size: 12px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(107, 33, 168, 0.2);">
                View Cart & Checkout
              </a>
            </div>
          </div>

          <!-- footer disclaimer -->
          <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa;">
            ${systemNameHub} &copy; 2026. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // Connect to Brevo SMTP host using configured details (direct SSL/TLS or STARTTLS)
    await sendRawSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPassword,
      to: validatedEmail,
      from: emailFromAddress,
      fromName: emailFromName,
      subject: `Your Shopping Cart Summary | ${systemName}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to send cart summary email", error, { emailTo: "[REDACTED]" });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email.",
    };
  }
}
