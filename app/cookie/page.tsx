import Link from 'next/link';
import type { Metadata } from 'next';
import { getSystemSetting } from '@/shared/platform/settings';

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  return {
    title: `Cookie Policy | ${systemName}`,
    description: `Cookie policy for the ${systemName} Multi-Vendor Commerce Marketplace. Learn about our strictly necessary and analytics cookies.`,
  };
}
export const revalidate = 86400;

export default async function CookiePolicy() {
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Marketplace
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Title */}
        <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl mb-3">
            Cookie Policy
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-650 dark:text-zinc-400">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. 
              <strong> {systemName}</strong> uses cookies to securely manage user sessions, enable core shopping cart functionality, and optionally gather performance analytics.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. Cookies and Tracking Consent
            </h2>
            <p>
              We distinguish between essential and analytical cookies to provide you with full control over your privacy:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Strictly Necessary:</strong> Required for secure session tokens, authentication state (managed securely by Clerk), and maintaining your persistent shopping cart. These cookies are essential for the platform to function and do not require prior consent. They cannot be turned off.
              </li>
              <li>
                <strong>Performance &amp; Analytics:</strong> Provided by Vercel Analytics and Vercel Speed Insights to help us monitor site performance and optimize page load speeds. These scripts and their associated cookies are strictly disabled unless you explicitly click &quot;Accept All&quot; or toggle them to active in our cookie settings drawer.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. Managing Your Preferences
            </h2>
            <p>
              You can review or change your cookie preferences at any time by clearing your browser cookies for this site, which will prompt our Cookie Consent banner to reappear on your next visit.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
