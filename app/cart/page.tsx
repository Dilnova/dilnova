import Link from 'next/link';
import CartCountBadge from '@/features/cart/components/CartCountBadge';
import CartClientIsland from '@/features/cart/components/CartClientIsland';

export default function CartPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans pb-24">
      {/* Top Header Bar */}
      <div className="max-w-6xl mx-auto px-6 pt-10 flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
            <Link href="/products" className="hover:text-purple-500 transition-colors">
              CATALOG
            </Link>
            <span>/</span>
            <span className="text-zinc-650 dark:text-zinc-350 font-bold uppercase">
              SHOPPING CART
            </span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-3">
            <span>Your Shopping Cart</span>
            <CartCountBadge />
          </h1>
        </div>

        <Link
          href="/products"
          className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100/50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          &larr; Continue Shopping
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <CartClientIsland />
      </div>
    </main>
  );
}
