import * as Sentry from "@sentry/nextjs";

const tracesSampleRate = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
  ? parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
  : 0.1; // Reduced from 1.0 to limit volume and PII risk

Sentry.init({
  enabled: process.env.NODE_ENV === 'production',
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Replay may not be desired if strict PII redaction is needed,
  // but if enabled, it should be configured to mask text.
  // We leave it out or disabled by default here to match previous strictly safe behavior.

  tracesSampleRate,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  beforeSend(event) {
    // Prevent PII leakage in error events
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.name;
    }
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
  
  beforeSendTransaction(event) {
    // Prevent PII leakage in performance spans
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.name;
    }
    return event;
  }
});
