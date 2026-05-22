import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md p-8 border border-red-200 bg-red-50/50 rounded-xl dark:border-red-950/30 dark:bg-red-950/10">
        <h1 className="text-2xl font-semibold text-red-700 dark:text-red-400 mb-2">
          403 - Unauthorized
        </h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-sm mb-6 leading-relaxed">
          Access Denied. You do not have the required permission level to access this page.
        </p>
        <Link 
          href="/" 
          className="text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
        >
          Return to Home Page
        </Link>
      </div>
    </main>
  );
}
