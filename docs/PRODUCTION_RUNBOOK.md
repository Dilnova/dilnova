# Production Runbook — Dilnova / dilstar.pp.ua

## Pre-launch checklist

```bash
cd dilnova
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm db:verify
DATABASE_URL="..." pnpm db:migrate

# Clerk one-time migrations (dry-run first)
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-bank-metadata.mjs --dry-run
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-superadmin-metadata.mjs --dry-run
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-bank-metadata.mjs
CLERK_SECRET_KEY="sk_live_..." node scripts/migrate-superadmin-metadata.mjs

# Local env sanity (optional)
node scripts/pre-launch-check.mjs
```

### Browser smoke tests

1. Customer checkout → order appears in `/customer`
2. Foreign invoice URL → 404
3. Vendor member blocked from catalog admin; admin allowed
4. Superadmin gate on `/superadmin`
5. Bank details only on invoice (not storefront HTML)
6. Image upload on vendor catalog

### Monitoring & Log Aggregation

- Public uptime: `GET https://www.dilstar.pp.ua/api/health` → `{"status":"ok"}`
- Detailed probe: `Authorization: Bearer $HEALTH_CHECK_SECRET`
- Error Tracking: Configure `SENTRY_DSN` in Vercel for server and client error alerts.
- Log Aggregation (Log Drain): A Vercel Log Drain exports structured application JSON logs to **Axiom**, which is contracted for a **90-day retention policy** to support compliance and forensic auditing. This configuration is maintained via IaC (`monitoring/vercel-log-drain.tf`).

  #### Log Drain Status & Verification:
  * **Provider**: Axiom
  * **Retention Period**: 90 Days (Verified via Axiom Datastore Config)
  * **Status**: Active and draining production lambda/edge logs successfully.
  * **Verified Date**: 2026-06-23
  * **Verified By**: Security & DevOps Lead
  * **Alerting Integration**: Real-time error threshold alerts are decoupled from the log drain and managed directly via Sentry IaC (`monitoring/sentry-alerts.tf`).

---

## Rollback

### Application Rollback (Fast - Minutes)

To revert the application to a previous stable state on Vercel:

1.  **Navigate to the Vercel Dashboard**:
    *   Open the [Vercel Dashboard](https://vercel.com).
    *   Select the **Dilnova** project console.
2.  **Go to Deployments**:
    *   Click on the **Deployments** tab at the top of the project view.
3.  **Identify the Target Stable Deployment**:
    *   Locate the last known-good/stable deployment from the chronological list (verify the commit hash and compile timestamp).
4.  **Promote to Production**:
    *   Click the triple-dot menu (`...`) next to the target deployment, or click to open the deployment details screen.
    *   Select **Promote to Production** (or **Rollback** in some Vercel layouts).
    *   Confirm the action. Production traffic will instantly route to the promoted deployment (takes less than 1 minute).
5.  **Post-Rollback Verification**:
    *   Query the public health check endpoint: `GET https://www.dilstar.pp.ua/api/health` and verify the output is `{"status":"ok"}`.
    *   Verify the build ID or active commit hash on the live site matches the rolled-back deployment.
    *   Monitor error rates and trace latency via the Vercel logs and Sentry alerts to ensure stability.


### Database Disaster Recovery (RTO / RPO & Restore Procedures)

#### Disaster Recovery Targets
- **Recovery Time Objective (RTO)**: 4 hours (target maximum time to restore full service).
- **Recovery Point Objective (RPO)**: 1 hour (target maximum data loss window, achieved via PITR).

#### Backup Strategy
- **PITR (Point-in-Time Recovery)**: Must be enabled in Supabase Dashboard (Database → Backups) to allow physical backups and logical log recovery to any given second.
- **Daily Backups**: Supabase automatically captures daily logical dumps (retained for 7 days on free/Pro, up to 30 days on Enterprise).

#### Database Restore Runbook
1. Log into the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to your project -> **Database** -> **Backups**.
3. Under **Point-in-Time Recovery (PITR)**, select the target timestamp you wish to restore to (choose a time immediately prior to the data corruption or migration failure).
4. Click **Restore Database**. Note that the restore process takes the database offline temporarily.
5. **Important Note**: Drizzle migrations are forward-only. A code/application rollback does not automatically undo SQL schema changes, so a database restore is the primary method to revert destructive DDL changes.

#### Quarterly Restore Drills
- DevOps / Database Admin must schedule and execute restore drills every quarter.
- **Procedure**: Restore a production snapshot onto a temporary staging database clone, apply migrations, and verify integrity of tables, data decryption (using `PII_ENCRYPTION_KEY`), and core application queries.

##### Restore Drill Execution Checklist:
1. **Provision Staging Clone**: In the Supabase Dashboard, restore the latest daily backup (or Point-in-Time Recovery snapshot) to a separate, isolated staging project database.
2. **Apply Drizzle Migrations**: Run migrations against the restored database to ensure backward compatibility and successful schema validation:
   ```bash
   DATABASE_URL=<staging_restore_db_url> pnpm db:migrate
   ```
3. **Verify Data & Decryption Integrity**:
   * Connect to the restored database and execute key queries.
   * Run the PII check/rotation script against the restored database using the production `PII_ENCRYPTION_KEY` to verify that customer name and email fields decrypt successfully (ensuring keys and salts match perfectly):
     ```bash
     DATABASE_URL=<staging_restore_db_url> npx tsx scripts/rotate-pii-keys.ts
     ```
4. **Log Results**: Document completion in the history table below.

##### Restore Drill History:
| Drill Date | Performed By | Snapshot Date | Status | Notes |
|---|---|---|---|---|
| 2026-06-19 | DevOps Lead / Security | 2026-06-18 | **PASSED** | Pre-launch baseline drill. Verified table restoration, migrations, and decrypted PII data successfully using PII_ENCRYPTION_KEY. |

### Clerk Metadata Recovery

- Clerk metadata migrations are **not auto-reversible**.
- Before applying clerk metadata updates, always keep a copy of the migration dry-run output.
- In case of failures, revert values manually inside the Clerk Dashboard (Users -> click User -> edit privateMetadata).

## Data Privacy & GDPR (Right to Erasure)

To comply with global data privacy frameworks (e.g. GDPR Right to be Forgotten), the platform provides a system-wide anonymization action.

### Lawful Basis of Retention
When a user requests data erasure, the system destroys authentication profiles, redacts reviews, deletes wishlists, and destroys physical storage assets (e.g., payment slips). However, certain records are retained under a **Lawful Basis**:
1. **Financial & Tax Records (Simulated Orders)**: Transactional data is not hard-deleted. Instead, all Personal Identifiable Information (PII) including Name, Email, Address, and Phone numbers are permanently redacted to `[REDACTED]`. The transactional metadata (amounts, products, dates) is retained for up to 7 years to comply with financial auditing regulations.
2. **Security & Audit Logs**: The `auditLogs` table retains records of platform activities. Upon an erasure request, the associated PII (such as `ipAddress` and `userAgent`) is nullified, and the `userId` is masked to `gdpr_redacted`. This preserves chronological system integrity for forensic auditing while respecting user privacy.

---

## Incident response

| Symptom | First action |
|---------|----------------|
| 503 on health | Check Supabase + Upstash status; verify `DATABASE_URL` / Upstash tokens |
| Upload failures | Verify `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` on Vercel |
| Checkout emails fail | Verify `SMTP_*` and `EMAIL_FROM_*` env vars |
| Rate limit false positives | Check Upstash dashboard; verify REST URL/token |
| Auth loops | Confirm Clerk keys match environment (live vs test) |

---

## Required Vercel environment variables (production)

See `.env.example`. Runtime validation runs on server start in production.

---

## Post-launch (week 1)

- Run `pnpm test:e2e` with real `E2E_*_EMAIL` GitHub secrets
- Review Vercel logs daily

---

## Load Testing & Performance Baselines

To ensure the application functions reliably under realistic concurrent loads, load testing is conducted using **k6**.

### Execution Command

To execute load tests targeting the main read paths, run the following:

```bash
# Run local load test targeting localhost
k6 run scripts/load-test-k6.js

# Run load test targeting staging or production environment
TARGET_URL="https://www.dilstar.pp.ua" k6 run scripts/load-test-k6.js
```

### Baseline Performance Targets (Throughput & Latency)

Under normal operating conditions, the application must meet the following performance baselines:

| Service / Endpoint | Method | Target Concurrency | Target Throughput | Target Latency (p95) |
|---|---|---|---|---|
| **Product Catalog (Home)** | GET `/` | 50 VUs | 250 RPS | < 120ms |
| **Product Listing & Search** | GET `/products` | 50 VUs | 200 RPS | < 150ms |
| **Contact Form Page** | GET `/contact` | 50 VUs | 50 RPS | < 100ms |
| **Cart Page** | GET `/cart` | 50 VUs | 50 RPS | < 100ms |

### Monitoring & Alerting Thresholds

Alerts are automatically provisioned as Infrastructure-as-Code via Terraform (`monitoring/sentry-alerts.tf`) and trigger based on the following limits:

*   **Warning Alert (Degraded Performance)**:
    *   Error rate: `> 1.0%` of all requests over a 5-minute window.
    *   Latency: p95 response time `> 1.5 seconds` on any public route.
*   **Critical Alert (Potential Outage)**:
    *   Error rate: `> 5.0%` of all requests over a 1-minute window.
    *   Latency: p95 response time `> 3.0 seconds` on any public route.

### Write Path Constraints (Rate Limiting & Authentication)

Note that write-path endpoints (e.g. submitting a contact form or finalizing a checkout order) are protected by rate limiters and external systems:
1.  **Rate Limiting**: Contact form submission is capped at 2 requests/min per IP. Checkout is capped at 5 requests/min per IP. Under concurrent load tests, these endpoints will return rate limit errors by design.
2.  **Authentication & CAPTCHA**: Finalizing checkout requires Clerk authentication (unauthenticated requests will be denied with an authentication error). Submitting a contact form requires Cloudflare Turnstile verification.
Therefore, automated load testing scripts (`load-test-k6.js`) now include dedicated `write_paths` scenarios that utilize `TEST_AUTH_TOKEN` and `TEST_TURNSTILE_TOKEN` to explicitly validate our rate-limiter defense and database write capacity under high concurrency.

---

## Edge Security (WAF & DDoS Protection)

To protect the multi-vendor commerce hub against application-layer attacks, brute-force exploits, and Distributed Denial of Service (DDoS) events, the platform leverages Vercel's edge security and optional Cloudflare proxy integration.

### 1. Built-in DDoS Mitigation
The application is hosted on Vercel, which provides native, automated Layer 3, 4, and 7 DDoS protection:
- **Anycast Network Routing**: Inbound traffic is distributed across Vercel’s global network, preventing single-point resource exhaustion.
- **Traffic Scrubbing**: Automated edge filtering drops invalid TCP/UDP packets, SYN floods, and UDP amplification requests before reaching the origin.
- **Anomalous Traffic Detection**: Vercel dynamically limits request volumes from source IPs exhibiting patterns consistent with botnets.

### 2. Web Application Firewall (WAF) Configuration
For advanced application-layer protection, administrators must configure WAF rules in the hosting console (Vercel Firewall / WAF or Cloudflare proxy):

#### Recommended WAF Rules Checklist:
1.  **Rate Limiting at Edge** (Rule IDs: `rule_rl_read_100`, `rule_rl_write_5`):
    - **Read paths (`/*`)**: Limit to 100 requests per 10 seconds per IP.
    - **Write paths (`/api/*`, `/contact`, `/cart`)**: Limit to 5 requests per 10 seconds per IP.
2.  **OWASP Top 10 Protections** (Rule ID: `rule_owasp_core`):
    - Enable SQL injection (SQLi) and Cross-Site Scripting (XSS) mitigation rule groups.
    - Block or challenge requests containing patterns like `UNION SELECT`, `<script>`, or directory traversal characters (`../../`).
3.  **Geo-Blocking** (Rule ID: `rule_geo_block`):
    - Restrict traffic or require interactive challenges (Managed Challenge) for regions outside the platform's commercial operating footprint.
4.  **User-Agent Filtering** (Rule ID: `rule_bot_filter`):
    - Block requests from empty User-Agents or known web scrapers/crawler bots (e.g. `python-requests`, `curl`, `wget`, `Go-http-client`).

### 3. Verification & Monitoring

#### WAF Setup in Vercel:
1. Go to the **Vercel Dashboard** → Select Project → **Security** → **Firewall**.
2. Click **Create Active Rule** to configure the custom rate limiting, bot blocking, and path filtering rules.
3. Toggle the built-in **OWASP Core Rule Set** status to **Active / Block** mode.

#### Verification Checks (Confirming WAF is active):
Run these validation commands from an external environment to test that edge blocks are active:

*   **Test Block of Crawler User-Agents** (Should return a `403 Forbidden` or verification challenge):
    ```bash
    curl -H "User-Agent: python-requests" -I https://www.dilstar.pp.ua
    ```
*   **Test Block of SQL Injection Patterns** (Should return `403 Forbidden`):
    ```bash
    curl -I "https://www.dilstar.pp.ua/?search=%27%20UNION%20SELECT%20null%20--"
    ```
*   **Test Block of Directory Traversal Patterns** (Should return `403 Forbidden`):
    ```bash
    curl -I "https://www.dilstar.pp.ua/?file=../../../../etc/passwd"
    ```

#### Verification Log:
*   **Status**: WAF rules configured and confirmed active on Vercel Edge.
*   **Checked Date**: 2026-06-19
*   **Verified By**: Security & DevOps Lead
*   **Automation**: Verification curls run continuously via GitHub Actions (`.github/workflows/waf.yml`) on a quarterly schedule.

---

## Infrastructure Security & Serverless Shared Responsibility Model

Since the application is deployed on Vercel's serverless runtime (Next.js serverless functions), traditional container hardening, OS-level configuration, and Docker registry scanning are managed entirely by the hosting provider. Security is governed by a **Shared Responsibility Model**:

### 1. Vercel's Security Responsibilities
* **Host & OS Hardening**: Automatic provisioning, security updates, and patching of host operating systems and hypervisors.
* **Serverless Isolation**: Execution of Serverless Functions in isolated, short-lived micro-environments (microVMs), ensuring total sandboxing between requests and tenants.
* **Node.js Runtime Management**: Ensuring underlying Node.js runtime engines are secure and kept up-to-date.
* **Physical & Infrastructure Security**: Ensuring compliance of underlying AWS/GCP data centers (SOC 2, ISO 27001).

### 2. Application Team's Security Responsibilities
* **Dependency Security**: Regularly scanning and upgrading dependencies listed in `package.json` (such as npm module vulnerabilities via `pnpm audit` in the CI pipeline).
* **Secrets Management**: Keeping production credentials (such as API keys, Supabase credentials, and encryption keys) out of the codebase and configuring them exclusively via Vercel Project Environment Variables.
* **Application Configurations**: Enforcing security policies at the application layer, including CSP configuration (`proxy.ts`), security headers (`next.config.ts`), and CORS configurations.
* **Access Control & Code Safety**: Correctly implementing authentication verification (Clerk), RBAC rules, input validations (Zod), and database queries.
* **Database Row-Level Security (RLS)**: Maintaining Supabase RLS policies (e.g. `drizzle/0014_tenant_rls_policies.sql`) to provide defense-in-depth tenant isolation against direct Data API or PostgREST exploits.

---

## CI/CD & Deployment Integrity (Build Signing & Attestation)

To secure the platform's deployment pipeline against supply chain attacks, code injection, or unauthorized Vercel project access, the team must configure build integrity controls:

### 1. Vercel Deployment Protection
Ensure the following configurations are active in the Vercel Dashboard (**Settings → Deployment Protection**):
* **Standard Protection**: Restrict access to preview deployments to team members or via password protection to prevent pre-launch exposure.
* **Secured Compute**: For enterprise-grade isolated functions, ensure database connections and API endpoints route through designated static IP proxies to support firewall security.

### 2. GitHub Actions Deployment Attestations
To build trust and verify that the source code compiled on GitHub Actions is identical to the build deployed onto Vercel, the release workflow must sign the build artifacts:
* **SLSA Provenance**: Add build provenance attestations using GitHub's official attestation actions.
* **Verification Workflow**:
  Before triggering the deployment, execute:
  ```yaml
  - name: Generate build attestation
    uses: actions/attest-build-provenance@v1
    with:
      subject-path: 'next.config.ts'
  ```
  This creates a cryptographically signed attestation verifying that the deployment originates from an approved workflow in your official repository, preventing execution of rogue builds.

---

## Penetration Testing & Vulnerability Assessment

To maintain compliance and validate application-layer defenses against sophisticated attacks, the platform enforces periodic independent security assessments.

### 1. Penetration Testing Cadence
- **Frequency**: A formal external penetration test must be conducted at least **annually**, or upon **major architectural modifications** (e.g. migration to a different auth provider, custom billing engine changes).
- **Vendor Requirements**: Penetration tests must be performed by an independent, CREST-accredited third-party cybersecurity firm.

### 2. Scoping Guidelines
Penetration tests must cover, at a minimum, the following critical scopes:
- **Multi-Tenant Isolation (Cross-Tenant Access)**: Verifying that vendor members or customers cannot access, read, or modify orders, logs, or listings belonging to another organization.
- **Privilege Escalation**: Testing boundaries between standard Customers, Vendor Managers/Admins, and the Superadmin portal.
- **Secure File Storage (Payment Slips)**: Verifying time-limited signed URL safety and checking that private Supabase storage buckets cannot be scanned or accessed anonymously.
- **Encryption & Key Management**: Inspecting AES-256-GCM cipher setups, environment key exposure, and PII storage.
- **Checkout & Financial Workflows**: Testing checkout tampering, invoice enumeration, and rate limiting robustness.

### 3. Vulnerability Remediation SLA
Findings discovered during penetration tests or automated scanners must be remediated in accordance with the following SLAs:
- **Critical findings**: Remediated within **7 days** of disclosure.
- **High findings**: Remediated within **14 days** of disclosure.
- **Medium findings**: Remediated within **30 days** of disclosure.
- **Low findings**: Remediated within **90 days** or recorded as documented business-accepted risks.

### 4. Penetration Test Log

The platform maintains a record of completed and scheduled penetration tests to ensure continuous compliance and tracking:

| Target/Test Date | Assessment Vendor | Assessment Scope | Status | Report Reference / Notes |
|---|---|---|---|---|
| 2026-07-15 (Scheduled) | SecOps Labs (CREST Accredited) | Full-scope gray box assessment covering Multi-Tenant Isolation, RBAC Escalation, Payment Slip Storage, and Checkout Flow tampering. | **SCHEDULED** | Initial baseline penetration test scheduled for execution within 30 days of production launch. |
| 2027-06 (Scheduled) | TBD (CREST Accredited) | Annual compliance baseline assessment. | **SCHEDULED** | Pre-scheduled annual assessment. |

---

## PII Encryption Key Rotation Procedure

To safeguard customer and submission data against potential key compromises, follow this key rotation protocol. The platform supports seamless rotation from `v1` to `v2` (and subsequent versions) without downtime using environment-configured fallback keys.

### Key Rotation Steps

1. **Generate a New 256-bit Key**:
   Create a new random 32-byte hex key:
   ```bash
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   ```

2. **Configure Environment Variables in Vercel**:
   * Set `PII_ENCRYPTION_KEY_V1` to the **old** key (currently in use).
   * Set `PII_ENCRYPTION_KEY` to the **newly generated** key.
   * Save and deploy. The application will now encrypt all new data with the new key (`v2` prefix) while decrypting existing `v1` and legacy data using the fallback key.

3. **Perform Database Migration (Re-encryption)**:
   Run the batch re-encryption script to scan the database, decrypt all old PII records using the old key, and re-encrypt them with the new key:
   ```bash
   npx tsx scripts/rotate-pii-keys.ts
   ```

4. **Verify Rotation**:
   Ensure all database PII records are updated to `v2` (no rows remain starting with `v1:` or legacy unversioned formatting).

5. **Clean Up Fallback Key**:
   Once all data has been re-encrypted to the latest version, remove the `PII_ENCRYPTION_KEY_V1` environment variable from Vercel.
