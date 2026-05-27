import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export default async function CustomerPage() {
  const { orgId, orgRole } = await auth();
  const user = await currentUser();

  // If not logged in, return unauthorized layout or redirect
  if (!user) {
    return (
      <main className="p-8 max-w-4xl mx-auto font-sans">
        <div className="border border-zinc-205 rounded-xl p-8 bg-white dark:border-zinc-800 dark:bg-zinc-955 text-center">
          <p className="text-sm font-mono text-zinc-500">Please sign in to access the Customer Portal.</p>
        </div>
      </main>
    );
  }

  // Query wishlist items for this user
  const userWishlist = await db
    .select()
    .from(schema.wishlists)
    .where(eq(schema.wishlists.userId, user.id));

  // Retrieve products in wishlist
  const wishlistItems = userWishlist.length > 0
    ? await db
        .select({
          product: schema.products,
          category: schema.categories,
        })
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(inArray(schema.products.id, userWishlist.map(w => w.productId)))
    : [];

  // Query Clerk vendors to map brand names
  const client = await clerkClient();
  const orgListResponse = await client.organizations.getOrganizationList({ limit: 100 });
  const organizations = orgListResponse.data;

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans flex-1 flex flex-col justify-center">
      <div className="border border-zinc-200 rounded-3xl p-6 md:p-10 bg-white dark:border-zinc-900 dark:bg-zinc-950 shadow-xl shadow-zinc-900/5 dark:shadow-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 mb-4 uppercase tracking-wider font-mono">
          Customer Area
        </span>
        
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
          Customer Portal
        </h1>
        <p className="text-zinc-450 dark:text-zinc-500 mb-6 font-mono text-xs">
          Logged in as: {user.firstName || 'Customer'} (Active Org Role: {orgRole || 'None'})
        </p>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

        <div className="space-y-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-350 leading-relaxed">
            Manage your saved items, view past transaction receipts, configure billing, and update delivery settings.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-5 dark:bg-zinc-900/30 dark:border-zinc-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-450 font-mono">My Account Status</h2>
              <ul className="space-y-2 text-xs text-zinc-650 dark:text-zinc-400 font-mono">
                <li><span className="text-zinc-400 dark:text-zinc-500">Org ID:</span> {orgId || 'None (Personal Account)'}</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">Membership:</span> Customer Portal</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">Address Profile:</span> Default</li>
              </ul>
            </div>

            <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-2xl p-5 dark:bg-zinc-900/30 dark:border-zinc-900 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-450 font-mono">Quick Overview</h2>
              <ul className="space-y-2 text-xs text-zinc-650 dark:text-zinc-400 font-mono">
                <li><span className="text-zinc-400 dark:text-zinc-500">Saved Items:</span> {wishlistItems.length} items wishlisted</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">Order Receipts:</span> 0 transactions</li>
              </ul>
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
              My Saved Items
            </h2>
            {wishlistItems.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/20 dark:bg-zinc-900/10">
                <span className="text-3xl">❤️</span>
                <p className="text-xs text-zinc-450 dark:text-zinc-500 font-mono mt-2">Your wishlist is currently empty.</p>
                <Link
                  href="/products"
                  className="inline-block mt-4 text-[10px] bg-purple-700 hover:bg-purple-800 text-white font-bold font-mono uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md shadow-purple-900/10"
                >
                  Browse Catalog
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {wishlistItems.map(({ product, category }) => {
                  const orgMatch = organizations.find((o) => o.id === product.orgId);
                  const vendorName = orgMatch ? orgMatch.name : 'Unknown Vendor';
                  const formattedPrice = (product.price / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  });

                  return (
                    <div
                      key={product.id}
                      className="flex border border-zinc-200/80 dark:border-zinc-850 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm relative group hover:border-purple-500/30 transition-all"
                    >
                      {product.imageUrl ? (
                        <div className="w-24 h-24 relative flex-shrink-0 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-900">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-xl flex-shrink-0 border-r border-zinc-100 dark:border-zinc-900">
                          📦
                        </div>
                      )}
                      
                      <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase truncate">
                              {category?.name || 'Catalog'}
                            </span>
                            <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              product.type === 'service'
                                ? 'bg-teal-500/10 text-teal-650 dark:text-teal-400'
                                : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400'
                            }`}>
                              {product.type}
                            </span>
                          </div>
                          <Link
                            href={`/products/${product.id}`}
                            className="block text-xs font-bold text-zinc-900 dark:text-zinc-55 hover:text-purple-650 dark:hover:text-purple-400 transition-colors truncate"
                          >
                            {product.name}
                          </Link>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">
                            By {vendorName}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-xs font-extrabold font-mono text-zinc-900 dark:text-zinc-200">
                            {formattedPrice}
                          </span>
                          <Link
                            href={`/products/${product.id}`}
                            className="text-[10px] font-bold font-mono text-purple-750 hover:text-purple-900 dark:text-purple-450 dark:hover:text-purple-300"
                          >
                            View &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-900">
          <Link 
            href="/"
            className="text-xs font-mono text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 underline underline-offset-4"
          >
            &larr; Back to Main Page
          </Link>
        </div>
      </div>
    </main>
  );
}

