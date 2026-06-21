import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { logger } from '@/shared/logging/logger';
import { invalidateClerkUserCache, invalidateClerkOrgCache } from '@/shared/auth/clerk-cache';

function verifyClerkWebhookSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  webhookSecret: string
): boolean {
  try {
    // Decodes the base64 part of the key
    const secretKey = webhookSecret.startsWith('whsec_')
      ? webhookSecret.substring('whsec_'.length)
      : webhookSecret;

    const keyBuffer = Buffer.from(secretKey, 'base64');

    // Verify timestamp (5-minute tolerance)
    const timestampMs = parseInt(svixTimestamp, 10) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      logger.warn('Clerk webhook verification failed: Timestamp drift too large', {
        svixTimestamp,
        now: Math.floor(now / 1000),
      });
      return false;
    }

    // Construct signature input
    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;

    // Compute HMAC-SHA256
    const hmac = crypto.createHmac('sha256', keyBuffer);
    const computedSignature = hmac.update(toSign).digest('base64');

    // Compare with timing-safe comparison
    const computedBuffer = Buffer.from(computedSignature, 'base64');
    const signatureParts = svixSignature.split(' ');

    for (const part of signatureParts) {
      const [version, signature] = part.split(',');
      if (version === 'v1') {
        const receivedBuffer = Buffer.from(signature, 'base64');
        if (
          computedBuffer.length === receivedBuffer.length &&
          crypto.timingSafeEqual(computedBuffer, receivedBuffer)
        ) {
          return true;
        }
      }
    }
  } catch (error) {
    logger.error('Error verifying Clerk webhook signature', error);
  }
  return false;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('CLERK_WEBHOOK_SECRET is not configured on the server');
    return NextResponse.json(
      { error: 'Webhook secret is not configured.' },
      { status: 500 }
    );
  }

  // Get Svix headers
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('Clerk webhook request missing required Svix headers');
    return NextResponse.json(
      { error: 'Missing required Svix headers.' },
      { status: 400 }
    );
  }

  // Get raw body text
  const payload = await req.text();

  // Verify signature
  const isValid = verifyClerkWebhookSignature(
    payload,
    svixId,
    svixTimestamp,
    svixSignature,
    webhookSecret
  );

  if (!isValid) {
    logger.warn('Invalid Clerk webhook signature', { svixId });
    return NextResponse.json(
      { error: 'Invalid webhook signature.' },
      { status: 401 }
    );
  }

  try {
    const event = JSON.parse(payload);
    const eventType = event.type;
    const data = event.data;

    logger.info(`Received Clerk webhook: ${eventType}`, { eventId: svixId });

    if (eventType === 'user.updated' || eventType === 'user.created') {
      const userId = data.id;
      if (userId) {
        invalidateClerkUserCache(userId);
      }
    } else if (
      eventType === 'organizationMembership.created' ||
      eventType === 'organizationMembership.updated' ||
      eventType === 'organizationMembership.deleted'
    ) {
      const orgId = data.organization?.id;
      const userId = data.public_user_data?.user_id;

      if (orgId) {
        invalidateClerkOrgCache(orgId);
      }
      if (userId) {
        invalidateClerkUserCache(userId);
      }
    } else if (eventType === 'organization.updated' || eventType === 'organization.deleted') {
      const orgId = data.id;
      if (orgId) {
        invalidateClerkOrgCache(orgId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to process Clerk webhook event payload', error);
    return NextResponse.json(
      { error: 'Error processing webhook payload.' },
      { status: 500 }
    );
  }
}
