# Tech Stack — Official Documentation

A quick-reference guide to every technology used in the Dilnova Commerce Hub, with links to the official documentation.

---

## Core Framework

| Technology | Version | Docs |
|---|---|---|
| **Next.js** | `16.2.6` | https://nextjs.org/docs |
| **React** | `19.2.x` | https://react.dev |
| **TypeScript** | `^5` | https://www.typescriptlang.org/docs |

---

## Authentication

| Technology | Version | Docs |
|---|---|---|
| **Clerk (Next.js SDK)** | `^7.3.0` | https://clerk.com/docs |
| **Clerk Testing Helpers** | `^1.13.7` | https://clerk.com/docs/testing/overview |

---

## Database & ORM

| Technology | Version | Docs |
|---|---|---|
| **PostgreSQL** (via Supabase) | — | https://www.postgresql.org/docs/ |
| **Supabase** | `^2.108.1` | https://supabase.com/docs |
| **Drizzle ORM** | `^0.45.2` | https://orm.drizzle.team/docs/overview |
| **Drizzle Kit** (migrations) | `^0.31.10` | https://orm.drizzle.team/docs/kit-overview |
| **postgres** (driver) | `^3.4.9` | https://github.com/porsager/postgres |

---

## Rate Limiting & Caching

| Technology | Version | Docs |
|---|---|---|
| **Upstash Redis** | `^1.38.0` | https://upstash.com/docs/redis/overall/getstarted |
| **Upstash Rate Limit** | `^2.0.8` | https://upstash.com/docs/redis/sdks/ratelimit-ts/overview |

---

## Media & File Storage

| Technology | Version | Docs |
|---|---|---|
| **Cloudinary (next-cloudinary)** | `^6.17.5` | https://next.cloudinary.dev |
| **Supabase Storage** | — | https://supabase.com/docs/guides/storage |

---

## Observability & Analytics

| Technology | Version | Docs |
|---|---|---|
| **Sentry** | `^10.57.0` | https://docs.sentry.io/platforms/javascript/guides/nextjs/ |
| **Vercel Analytics** | `^2.0.1` | https://vercel.com/docs/analytics |
| **Vercel Speed Insights** | `^2.0.0` | https://vercel.com/docs/speed-insights |

---

## Validation

| Technology | Version | Docs |
|---|---|---|
| **Zod** | `^4.4.3` | https://zod.dev |

---

## Environment & Configuration

| Technology | Version | Docs |
|---|---|---|
| **dotenv** | `^17.4.2` | https://github.com/motdotla/dotenv |

---

## Styling

| Technology | Version | Docs |
|---|---|---|
| **Tailwind CSS** | `^4` | https://tailwindcss.com/docs |
| **@tailwindcss/postcss** | `^4.3.1` | https://tailwindcss.com/docs/installation/using-postcss |

---

## Testing

| Technology | Version | Docs |
|---|---|---|
| **Vitest** (unit / integration) | `^3.2.6` | https://vitest.dev/guide/ |
| **Playwright** (E2E) | `^1.57.0` | https://playwright.dev/docs/intro |

---

## Build & Dev Tooling

| Technology | Version | Docs |
|---|---|---|
| **pnpm** (package manager) | `^8+` | https://pnpm.io/motivation |
| **ESLint** | `^9` | https://eslint.org/docs/latest/ |
| **tsx** (TypeScript runner) | `^4.22.3` | https://tsx.is |

---

## Deployment & Infrastructure

| Service | Docs |
|---|---|
| **Vercel** (hosting) | https://vercel.com/docs |
| **Supabase** (managed Postgres + storage) | https://supabase.com/docs |
| **Cloudflare Turnstile** (CAPTCHA) | https://developers.cloudflare.com/turnstile/ |

---

## Security References

| Topic | Reference |
|---|---|
| OWASP Top 10 | https://owasp.org/www-project-top-ten/ |
| Clerk Security | https://clerk.com/docs/security/overview |
| Supabase Auth & RLS | https://supabase.com/docs/guides/auth |
| Vercel Firewall / WAF | https://vercel.com/docs/security |
| CSP (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP |

---

> **Keeping this current**: When adding or upgrading a dependency, update this file with the new version and documentation link.
