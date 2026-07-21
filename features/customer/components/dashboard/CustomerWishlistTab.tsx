import Link from 'next/link';
import Image from 'next/image';
import { isVideoUrl } from '@/shared/media/media';
import WishlistRemoveButton from '@/features/customer/components/WishlistRemoveButton';

interface WishlistItem {
  product: any;
  category: any;
}

interface Organization {
  id: string;
  name: string;
}

interface CustomerWishlistTabProps {
  wishlistItems: WishlistItem[];
  organizations: Organization[];
}

export default function CustomerWishlistTab({
  wishlistItems,
  organizations,
}: CustomerWishlistTabProps) {
  return (
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
                <WishlistRemoveButton productId={product.id} />
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
  );
}
