import * as Sentry from "@sentry/nextjs";

const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : 0.1; // Reduced from 1.0 to limit volume and PII risk

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  tracesSampleRate,

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
