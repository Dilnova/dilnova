-- ═══════════════════════════════════════════════════════════════════════════
-- Dilnova Commerce Hub — Least-Privilege Database Role Provisioning
-- ═══════════════════════════════════════════════════════════════════════════
-- This script provisions a dedicated, least-privilege PostgreSQL role ('dilnova_app')
-- for application runtime connections (DATABASE_URL).
--
-- Security guarantees:
--  1. DML Only: SELECT, INSERT, UPDATE, DELETE on application tables.
--  2. No DDL: Cannot CREATE, ALTER, or DROP tables or schemas (preventing schema sabotage).
--  3. No Administrative Privileges: NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION.
--  4. Sequence Access: USAGE, SELECT on all sequences for auto-increment / identity columns.
--  5. Schema Isolation: USAGE on public schema, CREATE revoked.
--  6. Migration Separation: Schema migrations continue to use MIGRATION_DATABASE_URL
--     (direct port 5432, postgres role), preserving DDL capability for migrations.
--
-- Usage:
--   Option A: Run via CLI: pnpm run db:setup-role
--   Option B: Copy & execute this script in Supabase SQL Editor or via psql:
--             psql "$MIGRATION_DATABASE_URL" -f scripts/create-least-privilege-role.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create or configure the restricted role
-- NOTE: In production, replace 'CHANGE_ME_TO_A_SECURE_PASSWORD' with a high-entropy secret.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dilnova_app') THEN
    CREATE ROLE dilnova_app WITH LOGIN PASSWORD 'CHANGE_ME_TO_A_SECURE_PASSWORD'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
    RAISE NOTICE 'Role dilnova_app created successfully.';
  ELSE
    ALTER ROLE dilnova_app
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
    RAISE NOTICE 'Role dilnova_app already exists; enforced least-privilege attributes.';
  END IF;
END $$;

-- 2. Revoke schema creation privileges (blocks CREATE TABLE, DROP TABLE, ALTER TABLE)
REVOKE CREATE ON SCHEMA public FROM dilnova_app;

-- 3. Grant schema navigation access
GRANT USAGE ON SCHEMA public TO dilnova_app;

-- 4. Grant DML permissions on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dilnova_app;

-- 5. Grant sequence usage and select (required for SERIAL/BIGSERIAL/identity columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dilnova_app;

-- 6. Grant execute permissions on functions and procedures
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO dilnova_app;

-- 7. Configure default privileges for future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dilnova_app;

-- 8. Configure default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dilnova_app;

-- 9. Configure default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO dilnova_app;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE 'Least-privilege role setup complete for dilnova_app.';
END $$;
