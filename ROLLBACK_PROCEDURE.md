# 🚨 Dilnova Production Rollback Procedure

This document outlines the step-by-step procedure to rollback the production environment in the event of a critical failure, such as a botched database migration, broken authentication flow, or severe application crash immediately following a deployment.

---

## Phase 1: Assess and Halt

If production is actively failing:

1. **Pause CI/CD**: Go to the GitHub repository and pause/cancel any running GitHub Actions (`.github/workflows/ci.yml`).
2. **Lock Deployments**: In the Vercel Dashboard, navigate to **Settings > Git** and temporarily disable Git integration to prevent any automatic hotfixes from deploying over the broken state while you assess.

---

## Phase 2: Revert the Frontend (Vercel)

If the database schema is backwards compatible with the previous application version, a simple Vercel rollback is the fastest resolution.

1. Open the **Vercel Dashboard** for the `dilnova` project.
2. Go to the **Deployments** tab.
3. Find the last known successful production deployment (labeled `Production`).
4. Click the three dots (`...`) on the right side of the deployment and select **Promote to Production** (or **Rollback to this Deployment**).
5. Verify the frontend is stable. If the issue was purely UI/Client-side, the incident is resolved.

---

## Phase 3: Revert Database Migrations (Supabase + Drizzle)

If the deployment included a breaking database migration (e.g., dropping columns, changing types) that corrupted data or broke the previous application version, you must rollback the database.

### Option A: Drizzle Down Migrations (Preferred for simple schema changes)

If the migration was additive and can be safely reversed without data loss:

1. Locally checkout the previous stable Git commit.
2. Ensure you have the `MIGRATION_DATABASE_URL` pointing to production in your `.env`.
3. Use the Drizzle CLI to revert the last migration:
   ```bash
   npx drizzle-kit drop
   ```
   _Note: Drizzle does not have a native `down` command in the same way Prisma does. You may need to manually execute the generated `DROP` SQL scripts located in the `supabase/migrations` (or Drizzle out) folder against the production database using the Supabase SQL Editor._

### Option B: Supabase Point-In-Time Recovery (PITR) (Required for destructive changes)

If data was destroyed (e.g., `DROP TABLE`) or corrupted:

1. Open the **Supabase Dashboard** for the production project.
2. Go to **Database > Backups > Point in Time Recovery**.
3. Select a timestamp exactly 5 minutes _before_ the failed Vercel deployment triggered.
4. Click **Restore**.
   _Warning: The database will be briefly unavailable during restoration, and any legitimate transactions that occurred between the backup timestamp and the rollback will be lost._

---

## Phase 4: Revert Clerk Authentication Configuration

If the deployment involved changes to Clerk (e.g., Webhooks, JWT Templates, new OAuth providers):

1. Open the **Clerk Dashboard**.
2. Navigate to the **Webhooks** section.
3. If a new webhook endpoint was added for the failed deployment, disable or delete it, and re-enable the previous endpoint.
4. If JWT templates or session token durations were modified, manually revert them to their previous state in **Configure > Sessions**.

---

## Phase 5: Post-Mortem & Recovery

1. Once production is stable, unlock Vercel Git deployments.
2. In your local Git repository, revert the offending commit:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
3. Document the failure in a Post-Mortem report, focusing on _why_ the E2E tests (`test:e2e`) or staging environment did not catch the issue prior to production launch.
