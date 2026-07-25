# Cloudflare Infrastructure & Security Posture — Dilnova Commerce Hub

**Last Audited:** July 25, 2026  
**Primary Zone:** `dilstar.pp.ua`  
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

## 4. WAF & Edge Security Rules

| Security Layer        | Rule Name / Version                   | Status     | Action / Details                                   |
| :-------------------- | :------------------------------------ | :--------- | :------------------------------------------------- |
| **DDoS Protection**   | Cloudflare L7 DDoS Ruleset (v3370)    | ✅ Active  | Dynamic rate and anomaly challenge at edge         |
| **Managed WAF**       | Cloudflare Free Managed Ruleset (v70) | ✅ Active  | OWASP baseline & vulnerability signatures          |
| **Custom WAF Rule**   | **Protect Authentication**            | ✅ Enabled | `Managed Challenge` on `/sign-in*` and `/sign-up*` |
| **URL Normalization** | Managed URL Normalization Ruleset     | ✅ Enabled | Normalizes RFC paths before passing to origin      |

### Custom WAF Rule Expression

```http
(http.request.uri.path eq "/sign-in") or
(http.request.uri.path eq "/sign-up") or
(http.request.uri.path starts_with "/sign-in/") or
(http.request.uri.path starts_with "/sign-up/")
```

---

## 5. Application Codebase Integration (`proxy.ts`)

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

---

## 6. Infrastructure-as-Code (Terraform)

Cloudflare edge rate limiting is managed via `monitoring/cloudflare-waf.tf`:

- **Resource:** `cloudflare_ruleset.baseline_rate_limiting`
- **Baseline Rate Limit:** 500 requests per 60 seconds per client IP across `/*`.
- **Mitigation:** 5-minute IP block (`429 Too Many Requests`).

---

## 7. Action Log & Audit History

| Date       | Category | Action Item                                                           | Status       |
| :--------- | :------- | :-------------------------------------------------------------------- | :----------- |
| 2026-07-24 | Audit    | Full Cloudflare API & Zone Security Audit                             | ✅ Completed |
| 2026-07-24 | WAF      | Enabled "Protect Authentication" WAF rule for `/sign-in` & `/sign-up` | ✅ Completed |
| 2026-07-25 | Account  | Verified 2FA enforcement via Google Account 2-Step Verification       | ✅ Completed |
| 2026-07-25 | Codebase | Verified `proxy.ts` CSP & `cf-connecting-ip` header handling          | ✅ Verified  |
| 2026-07-25 | Docs     | Created `docs/CLOUDFLARE_POSTURE.md` security baseline document       | ✅ Completed |
