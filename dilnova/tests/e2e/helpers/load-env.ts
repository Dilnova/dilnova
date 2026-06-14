import path from 'node:path';
import dotenv from 'dotenv';

let loaded = false;

/** Load `.env.local` for E2E workers (Playwright setup runs outside Next.js). */
export function loadE2EEnv(): void {
  if (loaded) {
    return;
  }
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  process.env.CLERK_PUBLISHABLE_KEY ??= process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  loaded = true;
}
