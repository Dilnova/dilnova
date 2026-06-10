import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import Link from 'next/link';
import Image from 'next/image';
import { isVideoUrl } from '@/utils/media';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { getCachedOrganizations } from '@/utils/clerkCache';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CustomerPage({ searchParams }: PageProps) {
  const { orgRole } = await auth();
  const user = await currentUser();

  // If not logged in, return unauthorized layout or redirect
  if (!user) {
    return (
      <main className="p-8 max-w-4xl mx-auto font-sans">
        <div className="border border-zinc-200 rounded-3xl p-12 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-center shadow-md space-y-4">
          <span className="text-5xl">🔒</span>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Sign In Required</h2>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Please sign in to access your personal Customer Portal, saved wishlist items, and billing details.
          </p>
        </div>
      </main>
    );
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || 'No email';

  // Fetch Clerk organizations, wishlist, and simulated orders in parallel (reduce latency)
  const client = await clerkClient();
  const [userWishlist, organizations, orders] = await Promise.all([
    db
      .select()
      .from(schema.wishlists)
      .where(eq(schema.wishlists.userId, user.id)),
    getCachedOrganizations(client).catch(() => []),
    db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.customerEmail, userEmail))
      .orderBy(desc(schema.simulatedOrders.createdAt))
  ]);

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

  // Retrieve simulated order items
  const orderIds = orders.map((o) => o.id);
  const orderItems = orderIds.length > 0
    ? await db
        .select()
        .from(schema.simulatedOrderItems)
        .where(inArray(schema.simulatedOrderItems.orderId, orderIds))
    : [];

  // Group items by orderId
  const itemsByOrderId = orderItems.reduce((acc, item) => {
    if (!acc[item.orderId]) {
      acc[item.orderId] = [];
    }
    acc[item.orderId].push(item);
    return acc;
  }, {} as Record<string, typeof orderItems>);

  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || 'saved';

  const userAvatar = user.imageUrl;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Customer';
  const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';

  // Calculate stats
  const totalSpent = orders.reduce((sum, order) => {
    if (order.status !== 'cancelled') {
      return sum + order.totalAmount;
    }
    return sum;
  }, 0);

  const formattedTotalSpent = (totalSpent / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <main className="px-4 py-6 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-5xl mx-auto font-sans w-full flex-1 animate-fade-in">
      {/* User welcome header banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/5 via-indigo-900/5 to-transparent border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 bg-white dark:bg-zinc-950 shadow-xs mb-6">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] dark:opacity-[0.05]">
          <span className="text-9xl">👤</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {userAvatar ? (
            <Image src={userAvatar} alt={fullName} width={80} height={80} unoptimized className="w-20 h-20 rounded-full border border-purple-500/20 shadow-md object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center font-bold text-2xl text-purple-700 dark:text-purple-400 border border-purple-500/20 flex-shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center sm:text-left space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 uppercase tracking-wider font-mono">
              Verified Customer
            </span>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{fullName}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono">{userEmail} • Joined {joinedDate}</p>
          </div>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs transition-all hover:border-purple-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">Wishlist Items</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 font-mono">{wishlistItems.length}</h3>
            </div>
            <span className="text-xl bg-purple-50 dark:bg-purple-950/50 p-2 rounded-xl text-purple-600 dark:text-purple-400">❤️</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs transition-all hover:border-indigo-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">Orders Placed</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 font-mono">{orders.length}</h3>
            </div>
            <span className="text-xl bg-indigo-50 dark:bg-indigo-950/50 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">📋</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs transition-all hover:border-emerald-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">Total Spend</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 font-mono">{formattedTotalSpent}</h3>
            </div>
            <span className="text-xl bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">💰</span>
          </div>
        </div>
      </div>

      {/* Tabs segment control switcher */}
      <div className="flex bg-zinc-100 dark:bg-zinc-900/60 backdrop-blur-md p-1 rounded-2xl mb-8 border border-zinc-200/50 dark:border-zinc-800/30 max-w-sm">
        <Link
          href="?tab=saved"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'saved'
              ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          ❤️ Wishlist ({wishlistItems.length})
        </Link>
        <Link
          href="?tab=orders"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          📋 Orders ({orders.length})
        </Link>
        <Link
          href="?tab=settings"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          ⚙️ Profile
        </Link>
      </div>

      {/* Content tabs rendering */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Saved Wishlist Items</h3>
              <p className="text-xs text-zinc-500">Keep track of products and services you want to purchase.</p>
            </div>
            {wishlistItems.length > 0 && (
              <Link
                href="/products"
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Browse Products
              </Link>
            )}
          </div>

          {wishlistItems.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-950 p-8 shadow-sm max-w-md mx-auto">
              <span className="text-5xl">❤️</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-4">Your Wishlist is Empty</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Save items you like while browsing and they will show up here for quick access later.
              </p>
              <Link
                href="/products"
                className="inline-block mt-5 text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-900/10 cursor-pointer"
              >
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="flex bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 group relative"
                  >
                    {product.imageUrl ? (
                      <div className="w-28 h-28 relative flex-shrink-0 bg-zinc-50 dark:bg-zinc-900 overflow-hidden border-r border-zinc-100 dark:border-zinc-900">
                        {isVideoUrl(product.imageUrl) ? (
                          <video
                            src={product.imageUrl}
                            muted
                            loop
                            playsInline
                            autoPlay
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="112px"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-28 h-28 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-3xl flex-shrink-0 border-r border-zinc-100 dark:border-zinc-900">
                        📷
                      </div>
                    )}
                    
                    <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider truncate">
                            {category?.name || 'Catalog'}
                          </span>
                          <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            product.type === 'service'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400'
                          }`}>
                            {product.type}
                          </span>
                        </div>
                        <Link
                          href={`/products/${product.id}`}
                          className="block text-sm font-bold text-zinc-900 dark:text-zinc-55 hover:text-purple-705 dark:hover:text-purple-400 transition-colors truncate"
                        >
                          {product.name}
                        </Link>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                          By {vendorName}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-900">
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-200 font-mono">
                          {formattedPrice}
                        </span>
                        <Link
                          href={`/products/${product.id}`}
                          className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          View Item &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Order & Transaction History</h3>
            <p className="text-xs text-zinc-500 font-medium">View details and print invoices from your past storefront transactions.</p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-950 p-8 shadow-sm max-w-md mx-auto">
              <span className="text-5xl">📋</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-4">No Transactions Yet</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                When you purchase products or settle checkout invoices at vendor registers, your billing history will display here.
              </p>
              <Link
                href="/products"
                className="inline-block mt-5 text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-900/10 cursor-pointer"
              >
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const formattedOrderTotal = (order.totalAmount / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                });
                const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const items = itemsByOrderId[order.id] || [];
                const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

                let statusColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';
                if (order.status === 'fulfilled') {
                  statusColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
                } else if (order.status === 'cancelled') {
                  statusColor = 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400';
                }

                return (
                  <details
                    key={order.id}
                    className="group border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded-2xl overflow-hidden shadow-sm hover:border-purple-500/20 dark:hover:border-purple-500/25 transition-all [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 cursor-pointer select-none list-none outline-none">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-lg flex-shrink-0 text-purple-600 dark:text-purple-400 border border-purple-500/10">
                          📦
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                              Order #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-405 font-medium">{orderDate}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-900">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-50 font-mono mt-0.5">{formattedOrderTotal}</p>
                        </div>
                        <div className="text-zinc-400 group-open:rotate-180 transition-transform duration-200 pr-1 text-[10px] font-bold">
                          ▼
                        </div>
                      </div>
                    </summary>

                    <div className="border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 space-y-4">
                      {/* Items List */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 font-mono">Line Items</h4>
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 overflow-hidden">
                          {items.map((item) => {
                            const formattedUnitPrice = (item.unitPrice / 100).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            });
                            const formattedItemTotal = ((item.unitPrice * item.quantity) / 100).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            });
                            return (
                              <div key={item.id} className="flex items-center justify-between p-3.5 text-xs text-zinc-800 dark:text-zinc-200">
                                <div className="space-y-0.5 min-w-0 pr-4">
                                  <Link
                                    href={`/products/${item.productId}`}
                                    className="font-bold hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate block"
                                  >
                                    {item.productName}
                                  </Link>
                                  <p className="text-[10px] text-zinc-400 font-mono">
                                    Qty: {item.quantity} × {formattedUnitPrice}
                                  </p>
                                </div>
                                <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-right flex-shrink-0">
                                  {formattedItemTotal}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Invoice Print Link */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Customer Email: {order.customerEmail}
                        </div>
                        <Link
                          href={`/customer/invoice/${order.id}`}
                          target="_blank"
                          className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold tracking-wide transition-all border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                        >
                          🖨️ View & Print Invoice
                        </Link>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Profile & Account Settings</h3>
            <p className="text-xs text-zinc-500 font-medium">Manage preferences and view account configuration details.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm dark:bg-zinc-900/40 dark:border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">User Details</h4>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                <li><span className="text-zinc-400 dark:text-zinc-500">User ID:</span> {user.id}</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">First Name:</span> {user.firstName || '—'}</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">Last Name:</span> {user.lastName || '—'}</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">Org Context Role:</span> {orgRole || 'None'}</li>
              </ul>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm dark:bg-zinc-900/40 dark:border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">Address Preference</h4>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                <li><span className="text-zinc-400 dark:text-zinc-500">Shipping Profile:</span> Default</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">Address Status:</span> Verified</li>
                <li><span className="text-zinc-400 dark:text-zinc-500">Deliverability:</span> Active</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link 
          href="/"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 underline underline-offset-4"
        >
          &larr; Back to Main Page
        </Link>
      </div>
    </main>
  );
}
