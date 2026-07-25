# Cloudflare Infrastructure & Security Posture — Dilnova Commerce Hub

**Last Audited:** July 25, 2026  
**Primary Zone:** `dilstar.pp.ua`  
**Zone ID:** `6616c3ffd744fac484a9c47e79033086`  
**Account ID:** `fe597a83ee001fd3b6753353b5c7ca92`  
**Account Owner:** `dilukalahiruofficial@gmail.com`  
**Plan Level:** Free Website

---

## 1. Account & Access Security

| Property                  | Setting / Value            | Status       | Notes                                                                   |
| :------------------------ | :------------------------- | :----------- | :---------------------------------------------------------------------- |
| **Authentication Type**   | Google OAuth SSO           | ✅ Active    | Single-user Super Administrator account                                 |
| **Two-Factor Auth (2FA)** | Google 2-Step Verification | ✅ Completed | Enabled & verified on Google Account (`dilukalahiruofficial@gmail.com`) |
| **API Tokens**            | Minimal / Restricted       | ✅ Audited   | Zone-scoped read/write tokens used for Terraform automation             |

---

## 2. DNS & Routing Architecture

### Proxied Records (Orange Cloud — Edge Protection Active)

| Record Name         | Type  | Target / Value                        | Description                               |
| :------------------ | :---- | :------------------------------------ | :---------------------------------------- |
| `dilstar.pp.ua`     | CNAME | `59fd396d57dcd238.vercel-dns-017.com` | Apex route (Vercel App Router deployment) |
| `www.dilstar.pp.ua` | CNAME | `59fd396d57dcd238.vercel-dns-017.com` | WWW subdomain route                       |

### Unproxied Records (Gray Cloud — Direct Resolution)

| Record Name              | Type  | Target / Value                     | Reason for Unproxied State                                           |
| :----------------------- | :---- | :--------------------------------- | :------------------------------------------------------------------- |
| `accounts.dilstar.pp.ua` | CNAME | `accounts.clerk.services`          | Clerk custom domain routing (requires direct resolution)             |
| `clerk.dilstar.pp.ua`    | CNAME | `frontend-api.clerk.services`      | Clerk Frontend API resolution                                        |
| `clkmail.dilstar.pp.ua`  | CNAME | `mail.k17e5741n1x1.clerk.services` | Clerk transactional mail domain verification                         |
| `mail.dilstar.pp.ua`     | A     | `135.181.41.169`                   | Hetzner mail server origin (SMTP ports require direct IP connection) |

### Email Authentication & Security (SPF / DKIM / DMARC)

- **SPF Record:** `v=spf1 include:spf.sendinblue.com include:mx.cloudflare.net ~all`
- **DMARC Record:** `v=DMARC1; p=quarantine; pct=100; rua=mailto:rua@dmarc.brevo.com;`
- **DKIM Keys Configured:**
  - Brevo (`brevo1._domainkey`, `brevo2._domainkey`)
  - Clerk Auth (`clk._domainkey`, `clk2._domainkey`)
  - Cloudflare Email Routing (`cf2024-1._domainkey`)
- **MX Records:** Cloudflare Email Routing (`route1.mx.cloudflare.net` to `route3.mx.cloudflare.net`)

---

## 3. SSL/TLS & Edge Transport Security

- **Universal SSL Certificate:** Active — Issued by Google Trust Services (ECDSA SHA256 wildcard for `dilstar.pp.ua` and `*.dilstar.pp.ua`). Auto-renewing.
- **SSL/TLS Encryption Mode:** `Full (strict)` (Ensures encrypted transport between Cloudflare edge and Vercel edge).
- **Always Use HTTPS:** `ON` (Automatic HTTP → HTTPS 301 redirects).
- **Minimum TLS Version:** `TLS 1.2`.
- **HSTS Header:** Enforced via edge and `proxy.ts` (`max-age=63072000; includeSubDomains; preload`).

---

## 4. WAF & Edge Security Rules (5/5 Custom Rules Deployed)

| Rule # | Name                             | Expression Filter                                                                                                                                                                                                                                                      | Action              | Status               |
| :----- | :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ | :------------------- |
| **1**  | **Protect Authentication**       | `(http.request.uri.path eq "/sign-in") or (http.request.uri.path eq "/sign-up") or (http.request.uri.path starts_with "/sign-in/") or (http.request.uri.path starts_with "/sign-up/")`                                                                                 | `Managed Challenge` | ✅ Active            |
| **2**  | **Protect Admin Dashboards**     | `(http.request.uri.path eq "/admin") or (http.request.uri.path starts_with "/admin/") or (http.request.uri.path eq "/superadmin") or (http.request.uri.path starts_with "/superadmin/")`                                                                               | `Managed Challenge` | ✅ Active (Verified) |
| **3**  | **Block Exploit Scanners**       | `(http.request.uri.path contains ".php") or (http.request.uri.path contains ".env") or (http.request.uri.path contains ".git") or (http.request.uri.path contains "wp-admin") or (http.request.uri.path contains "xmlrpc") or (http.request.uri.path contains ".sql")` | `Block`             | ✅ Active            |
| **4**  | **Protect Webhooks**             | `(http.request.uri.path starts_with "/api/webhooks") and (not http.request.headers["user-agent"] contains "Clerk") and (not http.request.headers["user-agent"] contains "Svix") and (not http.request.headers["user-agent"] contains "QStash")`                        | `Block`             | ✅ Active            |
| **5**  | **Challenge Private Dashboards** | `(http.request.uri.path eq "/vendor") or (http.request.uri.path starts_with "/vendor/") or (http.request.uri.path eq "/customer") or (http.request.uri.path starts_with "/customer/")`                                                                                 | `Managed Challenge` | ✅ Active (Verified) |

---

## 5. Network, Bot & Client-Side Protections

- **Block AI Bots:** `Block on all pages` (Blocks `GPTBot`, `CCBot`, `Bytespider` from harvesting catalog data).
- **Mixed Purpose Crawlers:** Allowed (Preserves Google Search & Bing SEO indexing).
- **Bot Fight Mode:** `ON` (Edge-level challenge for automated bot traffic).
- **Browser Cache TTL:** `Respect Existing Headers` (Ensures Next.js ISR & `Cache-Control` directives take precedence).
- **IPv6 Compatibility:** `ON` (Native 5G/LTE connectivity).
- **WebSockets:** `ON` (Real-time updates enabled).
- **IP Geolocation:** `ON` (`CF-IPCountry` header forwarded to `proxy.ts`).
- **Email Address Obfuscation:** `ON` (Scrape Shield bot email obfuscation).

---

## 6. Application Codebase Integration (`proxy.ts`)

The Next.js 16 edge proxy (`proxy.ts`) is designed to integrate cleanly with Cloudflare:

1. **Client IP Extraction:**
   Reads `cf-connecting-ip` to ensure Upstash rate limiters receive true client IPs rather than Cloudflare edge proxies:
   ```typescript
   const ip =
     request.headers.get("cf-connecting-ip")?.trim() ||
     request.headers.get("x-real-ip")?.trim() ||
     request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
     "127.0.0.1";
   ```
2. **CSP Compatibility:**
   Whitelists `https://challenges.cloudflare.com` under `script-src` and `frame-src` so Cloudflare Turnstile and WAF challenges render without CSP violations.
3. **Response Headers:**
   Injects `Vary: Accept-Encoding` to prevent Cloudflare edge cache fragmentation across compression algorithms.

---

## 7. Infrastructure-as-Code (Terraform)

Cloudflare edge rate limiting is managed via `monitoring/cloudflare-waf.tf`:

- **Resource:** `cloudflare_ruleset.baseline_rate_limiting`
- **Baseline Rate Limit:** 500 requests per 60 seconds per client IP across `/*`.
- **Mitigation:** 5-minute IP block (`429 Too Many Requests`).

---

## 8. Live Verification & Terminal Audit Results

Audited live against production endpoint (`https://www.dilstar.pp.ua`) on **July 25, 2026**:

### Test 1: Edge Header Stack Verification

```bash
curl -I -s https://www.dilstar.pp.ua | grep -iE "(cf-cache-status|x-vercel-cache|server|strict-transport-security)"
```

**Live Result:**

- `server: cloudflare` ✅
- `strict-transport-security: max-age=63072000; includeSubDomains; preload` ✅
- `x-vercel-cache: MISS` ✅
- `cf-cache-status: DYNAMIC` ✅

### Test 2: Malicious Bot WAF Interception

```bash
curl -I -s -A "sqlmap/1.0" https://www.dilstar.pp.ua
```

**Live Result:** `HTTP/2 403 Forbidden` from Cloudflare Edge WAF ✅

### Test 3: Health Endpoint Reliability

```bash
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" https://www.dilstar.pp.ua/api/health; done
```

**Live Result:** 10/10 responses returned `200 OK` cleanly without false-positive rate limit blocks ✅

---

## 9. Action Log & Audit History

| Date       | Category | Action Item                                                                            | Status       |
| :--------- | :------- | :------------------------------------------------------------------------------------- | :----------- |
| 2026-07-24 | Audit    | Full Cloudflare API & Zone Security Audit                                              | ✅ Completed |
| 2026-07-24 | WAF      | Enabled "Protect Authentication" WAF rule for `/sign-in` & `/sign-up`                  | ✅ Completed |
| 2026-07-25 | Account  | Verified 2FA enforcement via Google Account 2-Step Verification                        | ✅ Completed |
| 2026-07-25 | Codebase | Verified `proxy.ts` CSP & `cf-connecting-ip` header handling                           | ✅ Verified  |
| 2026-07-25 | WAF      | Configured and deployed all 5/5 Custom WAF rules on Cloudflare Dashboard               | ✅ Completed |
| 2026-07-25 | Network  | Verified SSL/TLS `Full (strict)`, Caching `Respect Existing Headers`, IPv6, WebSockets | ✅ Completed |
| 2026-07-25 | Testing  | Executed live terminal curl audits (`sqlmap` 403, HSTS, `/api/health` 200 batch)       | ✅ Verified  |
| 2026-07-25 | Docs     | Updated `docs/CLOUDFLARE_POSTURE.md` and `docs/VERCEL_PROXY_STRATEGY.md`               | ✅ Completed |
