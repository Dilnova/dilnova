import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/logging/logger';
import { rateLimit } from '@/shared/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Aggressive rate limiting for CSP reports to prevent DoS (max 5 reports per minute per IP)
    await rateLimit(5, 60 * 1000);
    const contentType = req.headers.get('content-type') || '';
    
    let body: any;
    if (contentType.includes('application/csp-report') || contentType.includes('application/json')) {
      body = await req.json();
    } else {
      // Fallback in case browser sends raw text
      const rawText = await req.text();
      body = JSON.parse(rawText);
    }

    if (Array.isArray(body)) {
      // Report-To format (array of reports)
      for (const report of body) {
        logger.warn('CSP Violation Reported (Report-To)', {
          type: report.type,
          url: report.url,
          body: report.body,
          userAgent: report.user_agent,
        });
      }
    } else if (body && body['csp-report']) {
      // report-uri format
      const report = body['csp-report'];
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
      // Raw fallback
      logger.warn('CSP Violation Reported (Unknown Format)', { payload: body });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Failed to process CSP violation report', error);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 400 });
  }
}
