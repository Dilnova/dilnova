# Sentry — Official Reference

> **Version in use**: `@sentry/node ^10.57.0`
> **Official docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## Key Docs Links

| Topic                  | URL                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Next.js Guide          | https://docs.sentry.io/platforms/javascript/guides/nextjs/                                                 |
| Configuration          | https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/                                    |
| Instrumentation        | https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#create-initialization-config-files |
| Error Boundary         | https://docs.sentry.io/platforms/javascript/guides/nextjs/features/error-monitoring/                       |
| Performance Monitoring | https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/                                         |
| Source Maps            | https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/                                      |
| Session Replay         | https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/                                  |
| Releases & Deploys     | https://docs.sentry.io/product/releases/                                                                   |
| Alerts                 | https://docs.sentry.io/product/alerts/                                                                     |
| Dashboard              | https://sentry.io                                                                                          |

---

## How Dilnova Uses Sentry

- Initialized in `instrumentation.ts` for server-side error tracking
- `SENTRY_DSN` environment variable configured in Vercel

### Environment Variables

```env
SENTRY_DSN=https://...@sentry.io/...
```
