# Vendor Risk Register

This document serves as the formal Vendor Risk Register for the platform, acting as a mandatory control for compliance frameworks like SOC 2 and ISO 27001. It tracks critical third-party vendors, their data processing agreements (DPAs), and their security posture.

| Vendor         | Service Provided              | SOC 2 Report / Security Page                                 | DPA Executed | Data Residency    | Incident Notification SLA |
| -------------- | ----------------------------- | ------------------------------------------------------------ | ------------ | ----------------- | ------------------------- |
| **Vercel**     | Hosting, Edge Functions, WAF  | [SOC 2 Type II](https://vercel.com/security)                 | Yes          | US / Global Edge  | 24 Hours                  |
| **Clerk**      | Authentication & Identity     | [SOC 2 Type II](https://clerk.com/security)                  | Yes          | US                | 24 Hours                  |
| **Supabase**   | Postgres DB & Private Storage | [SOC 2 Type II](https://supabase.com/security)               | Yes          | US (Configurable) | 24 Hours                  |
| **Upstash**    | Redis (Rate Limiting)         | [SOC 2 Type II](https://upstash.com/trust)                   | Yes          | US / EU           | 24 Hours                  |
| **Cloudinary** | Image & Media Hosting         | [SOC 2 Type II](https://cloudinary.com/trust)                | Yes          | US                | 24 Hours                  |
| **Axiom**      | Forensic Log Aggregation      | [SOC 2 Type II](https://axiom.co/security)                   | Yes          | US                | 24 Hours                  |
| **Sentry**     | Error Monitoring              | [SOC 2 Type II](https://sentry.io/security/)                 | Yes          | US / EU           | 24 Hours                  |
| **Brevo**      | SMTP Email Relay              | [SOC 2 Type II / ISO 27001](https://www.brevo.com/security/) | Yes          | EU                | 24 Hours                  |
| **Cloudflare** | Turnstile (CAPTCHA)           | [SOC 2 Type II](https://www.cloudflare.com/trust-hub/)       | Yes          | Global Edge       | 24 Hours                  |

## Assessment Process

All critical vendors storing or processing customer data (PII) must:

1. Maintain an active **SOC 2 Type II** or **ISO 27001** certification.
2. Sign a **Data Processing Agreement (DPA)** outlining compliance with GDPR and CCPA.
3. Commit to an incident notification SLA of **24 hours or less** in the event of a suspected breach.

## Review Cycle

This register must be reviewed and updated **annually** or whenever a new critical vendor is onboarded. The compliance team must request and review updated SOC 2 reports from all vendors during the annual review.
