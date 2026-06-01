import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-lg space-y-8">
        {/* Large 404 number with gradient */}
        <div className="relative">
          <span className="text-[10rem] sm:text-[12rem] font-black leading-none tracking-tighter bg-gradient-to-b from-zinc-300 to-zinc-100 dark:from-zinc-700 dark:to-zinc-900 bg-clip-text text-transparent select-none">
            404
          </span>
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
        </div>

        <div className="space-y-3 -mt-8 relative">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Page not found
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Check the URL or navigate back to safety.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-lg h-10 px-5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Back to Home
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors h-10 px-4"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
