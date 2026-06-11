'use server';

import tls from 'tls';
import net from 'net';
import { rateLimit } from '@/utils/rateLimit';
import { z } from 'zod';
import { getSystemSetting } from '@/utils/settings';
import { DEFAULT_APP_URL } from '@/utils/brand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  vendorName: string;
  type: string;
}

// Custom SMTP transaction client using Node's net & tls modules, supporting STARTTLS
function sendRawSmtpEmail(options: {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const useTlsDirectly = options.port === 465;

    let socket: any;
    let step = 0;
    const responseLog: string[] = [];

    const send = (data: string) => {
      socket.write(data + '\r\n');
    };

    const handleData = (chunk: Buffer) => {
      const data = chunk.toString();
      responseLog.push(data);

      const lines = data.split('\r\n').filter(l => l.trim().length > 0);
      const lastLine = lines[lines.length - 1];
      const code = parseInt(lastLine.substring(0, 3), 10);

      // SMTP error codes
      if (code >= 400) {
        socket.destroy();
        reject(new Error(`SMTP Error at step ${step}: ${lastLine}`));
        return;
      }

      if (useTlsDirectly) {
        // Direct TLS state machine
        if (step === 0 && code === 220) {
          send('EHLO localhost');
          step = 1;
        } else if (step === 1 && code === 250) {
          send('AUTH LOGIN');
          step = 2;
        } else if (step === 2 && code === 334) {
          send(Buffer.from(options.user).toString('base64'));
          step = 3;
        } else if (step === 3 && code === 334) {
          send(Buffer.from(options.pass).toString('base64'));
          step = 4;
        } else if (step === 4 && code === 235) {
          send(`MAIL FROM:<${options.from}>`);
          step = 5;
        } else if (step === 5 && code === 250) {
          send(`RCPT TO:<${options.to}>`);
          step = 6;
        } else if (step === 6 && code === 250) {
          send('DATA');
          step = 7;
        } else if (step === 7 && code === 354) {
          const emailData = [
            `From: "${options.fromName}" <${options.from}>`,
            `To: ${options.to}`,
            `Subject: ${options.subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset="UTF-8"',
            '',
            options.html,
            '.'
          ].join('\r\n');
          send(emailData);
          step = 8;
        } else if (step === 8 && code === 250) {
          send('QUIT');
          step = 9;
        } else if (step === 9) {
          socket.destroy();
          resolve(true);
        }
      } else {
        // STARTTLS state machine (e.g. port 587)
        if (step === 0 && code === 220) {
          send('EHLO localhost');
          step = 1;
        } else if (step === 1 && code === 250) {
          send('STARTTLS');
          step = 1.5;
        } else if (step === 1.5 && code === 220) {
          // Upgrade to TLS!
          socket.removeAllListeners('data');
          const secureSocket = tls.connect({
            socket: socket,
            host: options.host,
            rejectUnauthorized: true
          }, () => {
            // Once connected, start SMTP handshake over secure socket
            step = 1.6;
            secureSocket.write('EHLO localhost\r\n');
          });

          secureSocket.on('data', handleSecureData);
          secureSocket.on('error', (err) => reject(err));
          socket = secureSocket;
        }
      }
    };

    const handleSecureData = (chunk: Buffer) => {
      const data = chunk.toString();
      responseLog.push(data);

      const lines = data.split('\r\n').filter(l => l.trim().length > 0);
      const lastLine = lines[lines.length - 1];
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (code >= 400) {
        socket.destroy();
        reject(new Error(`SMTP Error at step ${step}: ${lastLine}`));
        return;
      }

      if (step === 1.6 && code === 250) {
        send('AUTH LOGIN');
        step = 2;
      } else if (step === 2 && code === 334) {
        send(Buffer.from(options.user).toString('base64'));
        step = 3;
      } else if (step === 3 && code === 334) {
        send(Buffer.from(options.pass).toString('base64'));
        step = 4;
      } else if (step === 4 && code === 235) {
        send(`MAIL FROM:<${options.from}>`);
        step = 5;
      } else if (step === 5 && code === 250) {
        send(`RCPT TO:<${options.to}>`);
        step = 6;
      } else if (step === 6 && code === 250) {
        send('DATA');
        step = 7;
      } else if (step === 7 && code === 354) {
        const emailData = [
          `From: "${options.fromName}" <${options.from}>`,
          `To: ${options.to}`,
          `Subject: ${options.subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset="UTF-8"',
          '',
          options.html,
          '.'
        ].join('\r\n');
        send(emailData);
        step = 8;
      } else if (step === 8 && code === 250) {
        send('QUIT');
        step = 9;
      } else if (step === 9) {
        socket.destroy();
        resolve(true);
      }
    };

    if (useTlsDirectly) {
      socket = tls.connect({
        host: options.host,
        port: options.port,
        rejectUnauthorized: true,
      });
      socket.on('data', handleData);
      socket.on('error', (err: any) => reject(err));
      socket.on('end', () => {
        if (step < 9) {
          reject(new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`));
        }
      });
    } else {
      socket = net.connect({
        host: options.host,
        port: options.port,
      });
      socket.on('data', handleData);
      socket.on('error', (err: any) => reject(err));
      socket.on('end', () => {
        if (step < 9) {
          reject(new Error(`SMTP connection closed prematurely at step ${step}. Log: ${responseLog.join('\n')}`));
        }
      });
    }
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const cartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  quantity: z.number().int().positive(),
  vendorName: z.string(),
  type: z.string(),
});

const sendCartEmailSchema = z.object({
  emailAddress: z.string().email('Invalid email address format.'),
  cartItems: z.array(cartItemSchema),
  cartTotal: z.number().nonnegative(),
});

export async function sendCartSummaryEmailAction(
  emailAddress: string,
  cartItems: CartItem[],
  cartTotal: number
) {
  try {
    // ── Input Validation ──
    const parsedInput = sendCartEmailSchema.safeParse({
      emailAddress,
      cartItems,
      cartTotal,
    });
    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.issues[0]?.message || 'Invalid input data.' };
    }

    const { emailAddress: validatedEmail, cartItems: validatedItems, cartTotal: validatedTotal } = parsedInput.data;

    // ── Rate Limiting ──
    // Max 3 emails per minute per IP to prevent spamming/abuse of the SMTP relay
    await rateLimit(3, 60 * 1000);

    const systemName = await getSystemSetting('system_name', 'Dilnova');
    const systemNameHub = `${systemName} Commerce Hub`;

    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@dilstar.pp.ua';
    const emailFromName = process.env.EMAIL_FROM_NAME || `${systemName} Hub`;

    if (!smtpUser || !smtpPassword) {
      console.error('SMTP credentials (SMTP_USER/SMTP_PASSWORD) are missing');
      return { success: false, error: 'SMTP configuration is incomplete on the server.' };
    }

    // Calculations
    const taxRate = 0.08;
    const estimatedTax = validatedTotal * taxRate;
    const shippingFee = validatedTotal > 5000 ? 0 : 500;
    const grandTotal = validatedTotal + estimatedTax + shippingFee;

    const formatPrice = (cents: number) => {
      return (cents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    };

    // Construct beautiful HTML items rows
    const itemsHtml = validatedItems
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
      `
      )
      .join('');

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
                    <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(validatedTotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Estimated Tax (8%)</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(estimatedTax)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Shipping</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace;">${shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}</td>
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
  } catch (error: unknown) {
    console.error('Failed to send cart summary email:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error sending email.';
    return { success: false, error: errorMsg };
  }
}

// ═══════════════════════════════════════════════════════════
// SIMULATED CHECKOUT — Stock Validation & Order Placement
// ═══════════════════════════════════════════════════════════

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { resolveCheckoutOptionsForOrgs } from '@/utils/checkoutOptions';
import { getStockAvailabilityCatalog, resolveEffectiveStockAvailability } from '@/utils/stockAvailability';
import {
  reserveProductStock,
  applyStockReservation,
  type StockReservation,
} from '@/utils/inventoryStock';

interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  vendorName: string;
  type: string;
  vendorOrgId?: string;
}

const checkoutItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  vendorName: z.string(),
  type: z.string(),
  vendorOrgId: z.string().optional(),
});

const checkoutSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required.'),
  customerEmail: z.string().email('Invalid email address.'),
  items: z.array(checkoutItemSchema).min(1, 'Cart must contain at least one item.'),
  totalAmount: z.number().nonnegative(),
  fulfillmentMethod: z.string().min(1),
  paymentMethod: z.string().min(1),
  pickupBranchId: z.string().uuid().nullable().optional(),
});

export async function getCartCheckoutOptionsAction(productIds: string[]) {
  try {
    if (productIds.length === 0) {
      return {
        success: true as const,
        fulfillment: [],
        payment: [],
        pickupBranches: [],
        singleVendorOrgId: null,
      };
    }

    const uniqueIds = [...new Set(productIds)];
    const products = await db
      .select({ id: schema.products.id, orgId: schema.products.orgId })
      .from(schema.products)
      .where(inArray(schema.products.id, uniqueIds));

    const orgIds = products.map((p) => p.orgId);
    const uniqueOrgIds = [...new Set(orgIds)];

    const branchRows =
      uniqueOrgIds.length > 0
        ? await db
            .select({
              id: schema.branches.id,
              orgId: schema.branches.orgId,
              name: schema.branches.name,
              address: schema.branches.address,
              phone: schema.branches.phone,
            })
            .from(schema.branches)
            .where(inArray(schema.branches.orgId, uniqueOrgIds))
        : [];

    const branchesByOrg = new Map<
      string,
      { id: string; name: string; address: string | null; phone: string | null }[]
    >();
    for (const branch of branchRows) {
      const list = branchesByOrg.get(branch.orgId) || [];
      list.push({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      });
      branchesByOrg.set(branch.orgId, list);
    }

    const resolved = await resolveCheckoutOptionsForOrgs(orgIds, branchesByOrg);

    return {
      success: true as const,
      fulfillment: resolved.fulfillment.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.description,
        zeroShipping: o.zeroShipping === true,
        requiresBranch: o.requiresBranch === true,
      })),
      payment: resolved.payment.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.description,
      })),
      pickupBranches: resolved.pickupBranches,
      singleVendorOrgId: resolved.singleVendorOrgId,
    };
  } catch (error) {
    console.error('Failed to load checkout options:', error);
    return { success: false as const, error: 'Failed to load checkout options.' };
  }
}

export async function simulatedCheckoutAction(
  customerName: string,
  customerEmail: string,
  items: CheckoutItem[],
  totalAmount: number,
  fulfillmentMethod: string,
  paymentMethod: string,
  pickupBranchId?: string | null
) {
  try {
    // ── Input Validation ──
    const parsed = checkoutSchema.safeParse({
      customerName,
      customerEmail,
      items,
      totalAmount,
      fulfillmentMethod,
      paymentMethod,
      pickupBranchId: pickupBranchId || null,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid checkout data.' };
    }

    const {
      customerName: name,
      customerEmail: email,
      items: validItems,
      totalAmount: total,
      fulfillmentMethod: fulfillment,
      paymentMethod: payment,
      pickupBranchId: pickupBranch,
    } = parsed.data;

    // ── Rate Limiting ──
    await rateLimit(5, 60 * 1000); // Max 5 checkouts per minute

    // ── Concurrency Safe Stock Validation & Checkout ──
    return await db.transaction(async (tx) => {
      const stockErrors: string[] = [];
      const stockReservations: { productId: string; quantity: number; reservation: StockReservation }[] = [];
      const verifiedItems: { id: string; name: string; price: number; quantity: number; vendorOrgId: string }[] = [];
      let serverCalculatedTotal = 0;
      const availabilityCatalog = await getStockAvailabilityCatalog();

      // ── Verify Prices & Fetch Scoped Vendor IDs Server-side ──
      for (const item of validItems) {
        const [product] = await tx
          .select({
            id: schema.products.id,
            name: schema.products.name,
            price: schema.products.price,
            orgId: schema.products.orgId,
          })
          .from(schema.products)
          .where(eq(schema.products.id, item.id))
          .limit(1);

        if (!product) {
          throw new Error(`Product not found in catalog: ${item.name}`);
        }

        serverCalculatedTotal += product.price * item.quantity;
        verifiedItems.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          vendorOrgId: product.orgId,
        });
      }

      // ── Verify Client-provided Total Matches Server Calculations ──
      if (serverCalculatedTotal !== total) {
        throw new Error(`Checkout transaction price mismatch. Calculated: ${serverCalculatedTotal}, Received: ${total}`);
      }

      const vendorOrgIds = [...new Set(verifiedItems.map((item) => item.vendorOrgId))];
      const branchRows =
        vendorOrgIds.length > 0
          ? await tx
              .select({
                id: schema.branches.id,
                orgId: schema.branches.orgId,
                name: schema.branches.name,
                address: schema.branches.address,
                phone: schema.branches.phone,
              })
              .from(schema.branches)
              .where(inArray(schema.branches.orgId, vendorOrgIds))
          : [];

      const branchesByOrg = new Map<
        string,
        { id: string; name: string; address: string | null; phone: string | null }[]
      >();
      for (const branch of branchRows) {
        const list = branchesByOrg.get(branch.orgId) || [];
        list.push({
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
        });
        branchesByOrg.set(branch.orgId, list);
      }

      const resolvedOptions = await resolveCheckoutOptionsForOrgs(vendorOrgIds, branchesByOrg);
      const fulfillmentOption = resolvedOptions.fulfillment.find((o) => o.id === fulfillment);
      const paymentOption = resolvedOptions.payment.find((o) => o.id === payment);

      if (!fulfillmentOption) {
        return { success: false, error: 'Selected fulfillment method is not available for this cart.' };
      }
      if (!paymentOption) {
        return { success: false, error: 'Selected payment method is not available for this cart.' };
      }

      if (fulfillmentOption.requiresBranch) {
        if (!pickupBranch) {
          return { success: false, error: 'Please select a pickup branch to continue.' };
        }
        const validBranch = branchRows.find(
          (branch) => branch.id === pickupBranch && vendorOrgIds.includes(branch.orgId)
        );
        if (!validBranch) {
          return { success: false, error: 'Selected pickup branch is invalid.' };
        }
        if (vendorOrgIds.length > 1) {
          return {
            success: false,
            error: 'Store pickup is only available when all items are from the same vendor.',
          };
        }
      } else if (pickupBranch) {
        return { success: false, error: 'Pickup branch is only required for store pickup orders.' };
      }

      const pickupBranchForStock = fulfillmentOption.requiresBranch ? pickupBranch : null;

      for (const item of verifiedItems) {
        const [invMeta] = await tx
          .select({
            stockAvailability: schema.inventory.stockAvailability,
            quantity: schema.inventory.quantity,
          })
          .from(schema.inventory)
          .where(eq(schema.inventory.productId, item.id))
          .limit(1);

        if (!invMeta) {
          continue; // Untracked product — no stock limits
        }

        const availability = resolveEffectiveStockAvailability(
          availabilityCatalog,
          invMeta.stockAvailability,
          invMeta.quantity
        );
        if (availability && !availability.allowsPurchase) {
          stockErrors.push(`"${item.name}" is currently marked as ${availability.label} and cannot be purchased.`);
          continue;
        }

        const stockResult = await reserveProductStock(tx, item.id, item.quantity, {
          branchId: pickupBranchForStock,
          productName: item.name,
        });

        if (!stockResult.ok) {
          stockErrors.push(stockResult.error);
        } else {
          stockReservations.push({
            productId: item.id,
            quantity: item.quantity,
            reservation: stockResult.reservation,
          });
        }
      }

      if (stockErrors.length > 0) {
        return {
          success: false,
          error: `Insufficient stock:\n${stockErrors.join('\n')}`,
          stockErrors,
        };
      }

      const orderStatus = payment === 'cash_on_delivery' ? 'pending_payment' : 'pending';

      // ── Create Simulated Order ──
      const [order] = await tx
        .insert(schema.simulatedOrders)
        .values({
          customerName: name,
          customerEmail: email,
          totalAmount: serverCalculatedTotal,
          status: orderStatus,
          fulfillmentMethod: fulfillment,
          paymentMethod: payment,
          pickupBranchId: fulfillmentOption.requiresBranch ? pickupBranch : null,
        })
        .returning();

      if (!order) {
        throw new Error('Failed to create order record.');
      }

      // ── Insert Order Items using DB-verified information ──
      for (const item of verifiedItems) {
        await tx.insert(schema.simulatedOrderItems).values({
          orderId: order.id,
          productId: item.id,
          productName: item.name,
          vendorOrgId: item.vendorOrgId,
          quantity: item.quantity,
          unitPrice: item.price,
        });
      }

      // ── Deplete central (+ branch for store pickup) inventory ──
      for (const { quantity, reservation } of stockReservations) {
        await applyStockReservation(tx, quantity, reservation, {
          userId: 'customer',
          reason: `Online order ${order.id}`,
        });
      }

      return { success: true, orderId: order.id };
    });
  } catch (error: unknown) {
    console.error('Checkout failed:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error during checkout.';
    return { success: false, error: errorMsg };
  }
}
