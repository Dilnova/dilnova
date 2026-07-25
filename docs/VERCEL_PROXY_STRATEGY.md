# Proxy Architecture & Vercel Free Tier Strategy — Dilnova Commerce Hub

**Last Updated:** July 25, 2026  
**Primary Platform:** Vercel (hnd1 region)  
**Edge Middleware:** `proxy.ts` (Next.js 16 App Router)  
**Secondary Edge:** Cloudflare (DNS / SSL / Basic WAF)

---

## 1. Architectural Choice: Vercel Native Proxy vs. Cloudflare Proxy

Dilnova uses a **Vercel-Native Edge Proxy Architecture** powered by Next.js 16 `proxy.ts`.

### Architecture Topology

```
User Request
    │
    ▼
Vercel Edge (hnd1) ──► proxy.ts (WAF + Auth + Rate Limit) ──► Next.js App Router
    │                          │
    ▼                          ▼
Vercel CDN Edge         Upstash Redis / Clerk
```

### Why Vercel-Native (`proxy.ts`) Over Double Proxying (Cloudflare in front of Vercel)

| Evaluated Factor               | Vercel Native Edge (`proxy.ts`)   | Cloudflare in Front of Vercel | Decision Rationale                                                                                                                                          |
| :----------------------------- | :-------------------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 16 Compatibility**   | ✅ 100% Native                    | ⚠️ High Risk of Cache Issues  | Cloudflare proxies can strip or fragment Next.js internal headers (`Next-Router-State-Tree`), causing low cache hit ratios and broken ISR revalidations.    |
| **Network Hop Latency**        | ✅ Single Hop                     | ❌ Double Hop (+20–80ms)      | Eliminates extra transit latency between Cloudflare PoP and Vercel origin.                                                                                  |
| **Deployment Skew Protection** | ✅ Supported                      | ❌ Degraded                   | Vercel relies on edge-managed deployment IDs; double proxying can break client chunk version matching.                                                      |
| **Security & Visibility**      | ✅ Real IP directly in `proxy.ts` | ⚠️ Client IP Obscuration      | Direct Vercel proxy ensures threat detection inspects true client IPs without double header parsing complexity.                                             |
| **Official Recommendation**    | ✅ Recommended by Vercel          | ❌ Explicitly Discouraged     | Vercel documentation advises against placing third-party CDNs in front of Vercel deployments unless strictly required for specific enterprise requirements. |

---

## 2. In-Code WAF & Security Capabilities (`proxy.ts`)

The application-level edge proxy (`proxy.ts`) executes on every matched request and implements a multi-layer security system:

1. **WAF Pattern Protection:**
   - **Bot User-Agent Blocking:** Blocks automated scrapers and exploit tools (`python-requests`, `sqlmap`, `nikto`, `zgrab`, `nmap`, etc.).
   - **SQL Injection (SQLi) Defense:** Bounded, non-backtracking regex matches against `UNION SELECT`, `DROP TABLE`, `EXEC sp_`, `INSERT INTO`, and `UPDATE SET`.
   - **Cross-Site Scripting (XSS) Filter:** Intercepts `<script>`, `javascript:`, `onload=`, `onerror=`, `eval()` payloads.
   - **Directory Traversal Defense:** Prevents path traversal attempts (`../`, `/etc/passwd`, `c:\windows`).
   - **Command Injection Guard:** Blocks shell metacharacters and commands (`cat`, `ls`, `id`, `$(...)`).
   - **Iterative URL Decoding:** Evaluates up to 3 URL decoding passes to catch double/triple percent-encoded bypass attempts.

2. **Edge Rate Limiting:**
   - Powered by Upstash Redis sliding-window rate limiters.
   - **Read Requests:** 120 requests / 60 seconds per IP.
   - **Mutating Requests (POST/PUT/PATCH/DELETE):** 60 requests / 60 seconds per IP.
   - Returns standard `429 Too Many Requests` with `Retry-After` header when exceeded.

3. **CSRF & Origin Verification:**
   - Enforces strict `Origin` vs. `Host` / `X-Forwarded-Host` header matching for mutating requests (excluding webhooks & CSP reports).

4. **Security Headers & CSP:**
   - Enforces HSTS (`max-age=63072000; includeSubDomains; preload` in production).
   - Generates per-request cryptographic nonces attached to `Content-Security-Policy` with `strict-dynamic`.
   - Whitelists required service domains (Clerk Auth, Supabase, Cloudinary, Sentry, Google Fonts).

---

## 3. Vercel Hobby (Free Tier) Limits & Risk Assessment

Running Dilnova on Vercel's **Hobby (Free)** tier introduces specific platform constraints and policies that must be monitored.

### Hard Resource Quotas & Limits

Unlike paid tiers that bill overages, **the Hobby tier hard-pauses the project when any monthly limit is reached**, resulting in downtime until the next 30-day reset cycle.

| Resource Metric                     | Hobby Tier Quota           | Risk Level for Dilnova | Operational Impact                                                                                          |
| :---------------------------------- | :------------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------- |
| **Fast Data Transfer (Bandwidth)**  | 100 GB / month             | 🔴 **HIGH**            | Product image browsing across multi-tenant stores can burn 100 GB quickly.                                  |
| **Serverless Function Invocations** | 1,000,000 / month          | 🔴 **HIGH**            | `proxy.ts` + Server Actions run on every request. High traffic drains this fast.                            |
| **Edge Middleware Requests**        | 1,000,000 / month          | 🔴 **HIGH**            | Every page assets/API navigation counts against edge execution limits.                                      |
| **Edge Middleware CPU Time**        | **50ms average / request** | 🟡 **MEDIUM**          | Multi-pass URL decoding, WAF regex checks, Upstash REST calls, and Clerk middleware must finish under 50ms. |
| **Image Optimization**              | 5,000 transforms / month   | 🔴 **HIGH**            | Product catalog images using `next/image` exhaust 5k transformations fast.                                  |
| **Active CPU Time**                 | 4 CPU-hours / month        | 🟡 **MEDIUM**          | Heavy database queries (Drizzle ORM) or server rendering consume CPU hours.                                 |
| **Provisioned Memory**              | 360 GB-hours / month       | 🟡 **MEDIUM**          | Function memory allocations multiply by execution duration.                                                 |
| **Daily Deployments**               | 100 / day                  | 🟢 **LOW**             | Sufficient for normal dev workflows.                                                                        |

### Vercel Security Features: Free vs. Missing

| Feature                          | Included on Hobby Tier           | Requires Pro / Enterprise Tier               |
| :------------------------------- | :------------------------------- | :------------------------------------------- |
| **Automated DDoS Protection**    | ✅ Included (L3/L4/L7 unmetered) | —                                            |
| **Basic WAF & Attack Mode**      | ✅ Included                      | —                                            |
| **Custom WAF Rules**             | ⚠️ Max 3 custom rules            | ✅ Unlimited / Advanced                      |
| **Custom IP Blocks**             | ⚠️ Max 3 IP entries              | ✅ Unlimited                                 |
| **Log Drains / Export**          | ❌ Excluded                      | ✅ Required for Sentry/Datadog log streaming |
| **Spend Management Alerts**      | ❌ Excluded (hard pause)         | ✅ Budget thresholds & notifications         |
| **Deployment Protection (Prod)** | ❌ Excluded                      | ✅ Password/SSO protection for prod domains  |

### Critical Commercial Use Policy Notice

> [!CAUTION]
> **Vercel Terms of Service Policy:** Vercel's Hobby plan is strictly restricted to **non-commercial, personal projects**. Because Dilnova Commerce Hub is a multi-tenant eCommerce platform designed for commercial store management and transaction processing:
>
> - Running commercial operations on a Hobby account risks TOS suspension by Vercel.
> - Upgrading to **Vercel Pro ($20/seat/month)** is required upon production commercial launch or multi-tenant onboarding.

---

## 4. Optimization Strategy for Free Tier Longevity

To operate safely within Free Tier parameters during development and staging:

1. **Reduce WAF Edge CPU Overhead:**
   - Maintain the in-memory rate-limiter cache (`edgeLimiterCache` in `proxy.ts`) to avoid redundant Upstash HTTP round-trips for repeated requests.
   - Use early-return path exclusions for health checks (`/api/health`) and static assets.

2. **Optimize Image Transformations:**
   - Set `unoptimized: true` on secondary/thumb images or serve pre-optimized WebP assets via Cloudinary CDN directly.

3. **Prevent ISR Regeneration Abuse:**
   - Use `dynamicParams = false` in `generateStaticParams` for catalog pages so invalid product URLs return `404` without triggering serverless page generation.
   - Set conservative ISR revalidation intervals (`revalidate: 3600`) for non-critical catalog routes.

4. **Bot & Crawler Traffic Reduction:**
   - Maintain strict `robots.txt` disallowing aggressive AI crawlers and bad bots from triggering edge executions.
   - Integrate Cloudflare Turnstile on public client-side forms (`/sign-in`, `/sign-up`, checkout) to block bot submissions before they trigger server actions.

---

## 5. Upgrade Triggers (When to Switch to Vercel Pro)

Upgrade to Vercel Pro ($20/seat/month) immediately if any of the following conditions are met:

1. **Commercial Launch:** Tenant onboarding or active payment gateway processing.
2. **Bandwidth Warning:** Monthly bandwidth usage exceeds 75 GB (75% of limit).
3. **Invocation Warning:** Function invocations exceed 750,000 / month.
4. **Monitoring Requirement:** Enterprise compliance requiring automated log drains to third-party SIEM/Sentry systems.
5. **WAF Scale:** Needing >3 custom IP block rules at the CDN edge.
