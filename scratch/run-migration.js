/* eslint-disable */
/**
 * @deprecated Use `pnpm db:migrate` instead (Drizzle journal + migrate).
 * This script only applied 0002 manually and is kept for reference.
 */
console.warn('Deprecated: run `pnpm db:migrate` to apply all pending Drizzle migrations.');
console.warn('See scripts/verify-migrations.mjs and drizzle/meta/_journal.json');

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { execSync } = require('child_process');

try {
  execSync('pnpm db:migrate', { stdio: 'inherit', cwd: require('path').join(__dirname, '..') });
} catch (error) {
  process.exit(error.status ?? 1);
}
