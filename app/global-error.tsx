'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Global Error Boundary — catches errors in the root layout itself.
 * Must render its own <html> and <body> tags since the root layout has crashed.
 * This is the last line of defense before a blank white page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#09090b', color: '#fafafa' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            {/* Error icon */}
            <div style={{
              width: '5rem', height: '5rem', borderRadius: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="#ef4444">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Critical Error
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#a1a1aa', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              A critical application error occurred. Please try refreshing the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#52525b', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
                Error ID: {error.digest}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={reset}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  backgroundColor: '#7c3aed', color: 'white',
                  fontSize: '0.875rem', fontWeight: 600,
                  borderRadius: '0.5rem', height: '2.5rem', padding: '0 1.25rem',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: '0.875rem', fontWeight: 600, color: '#a1a1aa',
                  textDecoration: 'none', height: '2.5rem', padding: '0 1rem',
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
