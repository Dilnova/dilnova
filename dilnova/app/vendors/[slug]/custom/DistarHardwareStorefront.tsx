import Link from 'next/link';
import Image from 'next/image';
import type { StorefrontProps } from './types';
import { isVideoUrl } from '@/utils/media';
import AddToCartButton from '@/app/components/AddToCartButton';

/**
 * ═══════════════════════════════════════════════════════════════
 * DISTAR HARDWARE — Custom Storefront
 * ═══════════════════════════════════════════════════════════════
 * Dark industrial theme with bold typography, orange accent colors,
 * angular design elements, and a rugged professional feel.
 *
 * To customize: Edit this file directly. Change any layout, color,
 * section, or content. This is YOUR page — no restrictions.
 * ═══════════════════════════════════════════════════════════════
 */
export default function DistarHardwareStorefront({ org, products }: StorefrontProps) {
  const metadata = org.publicMetadata;

  return (
    <div
      className="min-h-screen font-sans"
      style={{
        /* Custom color tokens — change these to rebrand instantly */
        '--hw-primary': '#F97316',
        '--hw-primary-dark': '#EA580C',
        '--hw-surface': '#18181B',
        '--hw-surface-light': '#27272A',
        '--hw-text': '#FAFAFA',
        '--hw-text-muted': '#A1A1AA',
      } as React.CSSProperties}
    >
      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative bg-zinc-950 overflow-hidden">
        {/* Diagonal geometric background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(135deg, transparent 25%, rgba(249,115,22,0.08) 25%, rgba(249,115,22,0.08) 50%, transparent 50%),
                linear-gradient(135deg, transparent 25%, rgba(249,115,22,0.04) 25%, rgba(249,115,22,0.04) 50%, transparent 50%)
              `,
              backgroundSize: '80px 80px, 40px 40px',
            }}
          />
        </div>

        {/* Orange accent line at top */}
        <div className="h-1 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-orange-400 transition-colors mb-8"
          >
            ← Back to All Vendors
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Logo */}
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border-2 border-orange-500/30 bg-zinc-900 shadow-2xl shadow-orange-500/10 flex-shrink-0">
              <Image
                src={org.imageUrl}
                alt={org.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 112px, 144px"
                priority
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Official Store
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ✓ Verified Vendor
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
                {org.name}
              </h1>
              <p className="text-base text-zinc-400 max-w-2xl leading-relaxed">
                {metadata.description || 'Professional-grade tools and industrial equipment for contractors, builders, and tradespeople.'}
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-10 flex flex-wrap gap-6 border-t border-zinc-800 pt-8">
            <div>
              <span className="text-2xl font-black text-orange-500">{products.length}</span>
              <span className="text-xs text-zinc-500 ml-1.5 uppercase tracking-wider">Products</span>
            </div>
            <div>
              <span className="text-2xl font-black text-orange-500">
                {products.filter(p => p.type === 'service').length}
              </span>
              <span className="text-xs text-zinc-500 ml-1.5 uppercase tracking-wider">Services</span>
            </div>
            <div>
              <span className="text-2xl font-black text-orange-500">4.9</span>
              <span className="text-xs text-zinc-500 ml-1.5 uppercase tracking-wider">Rating</span>
            </div>
            <div>
              <span className="text-2xl font-black text-orange-500">12K+</span>
              <span className="text-xs text-zinc-500 ml-1.5 uppercase tracking-wider">Orders</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CATEGORIES SHOWCASE ───────────────────────── */}
      <section className="bg-zinc-900 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Shop by Category
            </h2>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🔨', label: 'Hand Tools', count: products.filter(p => p.categorySlug === 'hardware').length },
              { icon: '⚡', label: 'Power Tools', count: 0 },
              { icon: '🔩', label: 'Fasteners', count: 0 },
              { icon: '🦺', label: 'Safety Gear', count: 0 },
            ].map((cat) => (
              <div
                key={cat.label}
                className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 hover:border-orange-500/40 hover:bg-zinc-800 transition-all duration-300 cursor-pointer"
              >
                <span className="text-3xl block mb-3">{cat.icon}</span>
                <h3 className="text-sm font-bold text-white mb-0.5">{cat.label}</h3>
                <span className="text-[10px] font-mono text-zinc-500">{cat.count} items</span>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL PRODUCTS ─────────────────────────────────────── */}
      <section className="bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-orange-500 rounded-full" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                All Products
              </h2>
              <span className="text-xs font-mono text-zinc-600 ml-2">
                {products.length} items available
              </span>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 border border-zinc-800 rounded-2xl bg-zinc-900/30">
              <p className="text-sm text-zinc-500">No products listed yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const formattedPrice = (product.price / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                });

                return (
                  <div
                    key={product.id}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-col justify-between"
                  >
                    <Link href={`/products/${product.id}`} className="flex-1 flex flex-col group/item">
                      {/* Product Image */}
                      <div className="h-48 bg-zinc-800 relative overflow-hidden">
                        {product.imageUrl ? (
                          isVideoUrl(product.imageUrl) ? (
                            <video
                              src={product.imageUrl}
                              muted
                              loop
                              playsInline
                              autoPlay
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-zinc-800 to-zinc-900">
                            🔧
                          </div>
                        )}

                        {/* Type badge */}
                        <span className={`absolute top-3 right-3 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded ${
                          product.type === 'service'
                            ? 'bg-teal-500 text-teal-950'
                            : 'bg-orange-500 text-orange-950'
                        }`}>
                          {product.type}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {product.categoryName && (
                            <span className="text-[9px] font-mono text-orange-500/60 uppercase tracking-widest">
                              {product.categoryName}
                            </span>
                          )}
                          <h3 className="text-sm font-bold text-white mt-1 line-clamp-1 group-hover/item:text-orange-400 transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-xs text-zinc-500 line-clamp-2 mt-1.5 leading-relaxed">
                            {product.description || 'No description available.'}
                          </p>
                        </div>
                      </div>
                    </Link>

                    {/* Price & CTA */}
                    <div className="px-5 pb-5 flex items-center justify-between border-t border-zinc-800/60 pt-4">
                      <span className="text-lg font-black text-white">{formattedPrice}</span>
                      <div className="flex items-center gap-2">
                        <AddToCartButton
                          product={{
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            imageUrl: product.imageUrl,
                            vendorName: org.name,
                            type: product.type,
                          }}
                          canPurchase={product.canPurchase !== false}
                          showLabel={false}
                          className="h-8 w-8 text-xs rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                        />
                        <Link
                          href={`/products/${product.id}`}
                          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white transition-colors cursor-pointer text-center"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CONTACT CTA BANNER ───────────────────────────────── */}
      <section className="bg-gradient-to-r from-orange-600 to-amber-600">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Need bulk pricing or custom orders?
            </h2>
            <p className="text-sm text-orange-100/80 mt-1">
              Contact our sales team for contractor discounts and wholesale inquiries.
            </p>
          </div>
          <a
            href={`mailto:info@${org.slug}.com`}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white hover:bg-zinc-100 px-8 text-sm font-bold text-orange-600 transition-colors cursor-pointer shadow-lg shadow-orange-700/20 flex-shrink-0"
          >
            Get a Quote →
          </a>
        </div>
      </section>

      {/* ── FOOTER INFO ──────────────────────────────────────── */}
      <section className="bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src={org.imageUrl} alt={org.name} width={32} height={32} className="rounded-lg" />
            <span className="text-xs font-bold text-zinc-400">{org.name}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            {metadata.address && <span>📍 {metadata.address}</span>}
            {metadata.phone && <span>📞 {metadata.phone}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
