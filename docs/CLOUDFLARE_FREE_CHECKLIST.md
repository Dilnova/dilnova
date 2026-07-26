# Cloudflare Free Tier Audit & Optimization Checklist — Dilnova

**Zone:** `dilstar.pp.ua`  
**Origin:** Vercel App Router (`hnd1`)  
**Target Architecture:** Cloudflare Orange Cloud DNS Proxy → Vercel Origin → `proxy.ts`

---

## 📋 Comprehensive Verification Checklist (20+ Items)

### 1. DNS & Proxied Records Configuration

- [ ] **Apex Domain Record:** `dilstar.pp.ua` CNAME to `*.vercel-dns-017.com` → **Proxied (Orange Cloud ☁️)**
- [ ] **WWW Subdomain Record:** `www.dilstar.pp.ua` CNAME to `*.vercel-dns-017.com` → **Proxied (Orange Cloud ☁️)**
- [ ] **Clerk Auth Domains:** `accounts.dilstar.pp.ua`, `clerk.dilstar.pp.ua`, `clkmail.dilstar.pp.ua` → **DNS Only (Gray Cloud 🔘)** _(Required by Clerk SSL verification)_
- [ ] **Mail Server IP:** `mail.dilstar.pp.ua` → **DNS Only (Gray Cloud 🔘)** _(SMTP ports require direct resolution)_

---

### 2. SSL / TLS Settings (Dashboard → SSL/TLS)

- [ ] **Encryption Mode:** `Full (strict)` _(Ensures Cloudflare-to-Vercel transport is 100% encrypted)_
- [ ] **Always Use HTTPS:** `ON` _(Applies 301 redirect at Cloudflare edge before reaching Vercel)_
- [ ] **Minimum TLS Version:** `TLS 1.2` _(Disables legacy vulnerable TLS 1.0/1.1)_
- [ ] **TLS 1.3:** `Enabled` _(Optimal handshake speed)_
- [ ] **Automatic HTTPS Rewrites:** `ON` _(Fixes mixed content issues)_
- [ ] **Universal SSL Certificate:** `Active` _(ECDSA SHA256 certificate issued)_

---

### 3. Caching & Header Rules (Dashboard → Caching → Configuration)

- [ ] **Browser Cache TTL:** Set to **"Respect Existing Headers"** _(CRITICAL: Prevents Cloudflare from overriding Next.js `Cache-Control` / ISR headers)_
- [ ] **Development Mode:** `OFF` _(Must be off in production)_
- [ ] **Always Online:** `OFF` or `ON` _(Optional: OFF avoids serving stale HTML when Vercel is deploying)_
- [ ] **Purge Cache:** Verify ability to purge cache on demand if stale content is served.

---

### 4. Security & WAF (Dashboard → Security)

- [ ] **Security Level:** `Medium` or `High`
- [ ] **Bot Fight Mode:** `ON` _(Free tier basic bot challenge for automated scripts)_
- [ ] **WAF Custom Rules (1 of 5 used):**
  - [ ] Rule 1: **"Protect Authentication"** → `(http.request.uri.path starts_with "/sign-in") or (http.request.uri.path starts_with "/sign-up")` → **Managed Challenge**
- [ ] **Recommended New Free Rules (Slots 2–5):**
  - [ ] Rule 2 (Geo-Restriction): Challenge traffic from non-target regions if operating locally.
  - [ ] Rule 3 (API Protection): Challenge unauthenticated access to `/api/` paths.
- [ ] **Rate Limiting Rule (Terraform):** `500 req / 60s per IP` → **Block 5m** _(Configured via `monitoring/cloudflare-waf.tf`)_

---

### 5. Network & Performance (Dashboard → Network / Speed)

- [ ] **HTTP/2:** `ON`
- [ ] **HTTP/3 (with QUIC):** `ON` _(Faster mobile network connections)_
- [ ] **0-RTT Connection Resumption:** `ON` _(Zero latency reconnect)_
- [ ] **gRPC:** `ON` _(Optional)_
- [ ] **IPv6 Compatibility:** `ON`
- [ ] **WebSockets:** `ON` _(Required if real-time features are enabled)_
- [ ] **Auto Minify:** `JavaScript: OFF`, `CSS: OFF`, `HTML: OFF` _(IMPORTANT: Let Next.js/Vercel build pipeline handle minification to prevent breaking hydration)_

---

### 6. Scrape Shield & Email Protection (Dashboard → Security → Scrape Shield)

- [ ] **Email Address Obfuscation:** `ON` _(Hides support emails from bots)_
- [ ] **Server Side Excludes (SSE):** `ON`
- [ ] **Hotlink Protection:** `OFF` _(Allows product image sharing)_

---

### 7. Verification Steps (Terminal Commands)

Run these `curl` commands to verify the live posture:

#### Test 1: Verify Dual-Header Stack

```bash
curl -I -s https://www.dilstar.pp.ua | grep -iE "(cf-cache-status|x-vercel-cache|server|strict-transport-security)"
```

_Expected Output:_

- `server: cloudflare`
- `strict-transport-security: max-age=63072000; includeSubDomains; preload`

#### Test 2: Verify WAF Bot Protection

```bash
curl -I -s -A "sqlmap/1.0" https://www.dilstar.pp.ua
```

_Expected Output:_ `HTTP/2 403` (Blocked by `proxy.ts` / Cloudflare WAF)

#### Test 3: Verify Rate Limiter

```bash
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" https://www.dilstar.pp.ua/api/health; done
```

_Expected Output:_ `200` for normal traffic.
