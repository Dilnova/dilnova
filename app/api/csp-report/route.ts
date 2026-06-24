import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/logging/logger';
import { rateLimit } from '@/shared/security/rate-limit';
import { z } from 'zod';

const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB

const reportUriSchema = z.object({
  'csp-report': z.object({
    'document-uri': z.string().optional(),
    'blocked-uri': z.string().optional(),
    'violated-directive': z.string().optional(),
    'effective-directive': z.string().optional(),
    'original-policy': z.string().optional(),
    'line-number': z.number().or(z.string()).optional(),
    'column-number': z.number().or(z.string()).optional(),
    'source-file': z.string().optional(),
    'status-code': z.number().or(z.string()).optional(),
    referrer: z.string().optional(),
  }).passthrough(),
});

const reportToSchema = z.array(
  z.object({
    type: z.string().optional(),
    url: z.string().optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    user_agent: z.string().optional(),
  }).passthrough()
);

export async function POST(req: NextRequest) {
  try {
    // Aggressive rate limiting for CSP reports to prevent DoS (max 5 reports per minute per IP)
    await rateLimit(5, 60 * 1000);

    const rawText = await req.text();
    
    if (rawText.length > MAX_PAYLOAD_SIZE) {
      logger.warn('CSP report payload exceeded size limit', { size: rawText.length });
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (Array.isArray(body)) {
      const parsed = reportToSchema.safeParse(body);
      if (parsed.success) {
        for (const report of parsed.data) {
          logger.warn('CSP Violation Reported (Report-To)', {
            type: report.type,
            url: report.url,
            body: report.body,
            userAgent: report.user_agent,
          });
        }
      } else {
        logger.warn('CSP Violation Reported (Report-To invalid shape)', { error: parsed.error.message });
      }
    } else {
      const parsed = reportUriSchema.safeParse(body);
      if (parsed.success) {
        const report = parsed.data['csp-report'];
        logger.warn('CSP Violation Reported (report-uri)', {
          documentUri: report['document-uri'],
          blockedUri: report['blocked-uri'],
          violatedDirective: report['violated-directive'],
          effectiveDirective: report['effective-directive'],
          originalPolicy: report['original-policy'],
          lineNumber: report['line-number'],
          columnNumber: report['column-number'],
          sourceFile: report['source-file'],
          statusCode: report['status-code'],
          referrer: report['referrer'],
        });
      } else {
        logger.warn('CSP Violation Reported (Unknown/Invalid Format)', { error: parsed.error.message });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Failed to process CSP violation report', error);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 400 });
  }
}

