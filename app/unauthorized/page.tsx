import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md p-8 border border-red-200 bg-red-50/50 rounded-xl dark:border-red-950/30 dark:bg-red-950/10">
        <h1 className="text-2xl font-semibold text-red-700 dark:text-red-400 mb-2">
          403 - Unauthorized
        </h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-sm mb-6 leading-relaxed">
          Access denied. You do not have the required permission level to access this page.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
