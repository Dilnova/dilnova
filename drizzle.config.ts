import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL!,
  },
});
