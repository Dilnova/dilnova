import Link from 'next/link';
import Image from 'next/image';
import type { StorefrontProps } from './types';

/**
 * ═══════════════════════════════════════════════════════════════
 * DISTAR NURSERY — Custom Storefront
 * ═══════════════════════════════════════════════════════════════
 * Soft organic nature theme with earthy greens, cream backgrounds,
 * botanical design elements, rounded shapes, and a warm feel.
 *
 * To customize: Edit this file directly. Change any layout, color,
 * section, or content. This is YOUR page — no restrictions.
 * ═══════════════════════════════════════════════════════════════
 */
export default function DistarNurseryStorefront({ org, products }: StorefrontProps) {
  const metadata = org.publicMetadata;
  const plantProducts = products.filter(p => p.type === 'product');
  const serviceProducts = products.filter(p => p.type === 'service');

  return (
    <div
      className="min-h-screen font-sans"
      style={{
        /* Custom color tokens — change these to rebrand instantly */
        '--leaf-primary': '#16A34A',
        '--leaf-secondary': '#15803D',
        '--leaf-cream': '#FEFCE8',
        '--leaf-warm': '#FEF9C3',
      } as React.CSSProperties}
    >
      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-emerald-950 via-emerald-900 to-green-900 overflow-hidden">
        {/* Botanical pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(34,197,94,0.3) 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, rgba(34,197,94,0.2) 0%, transparent 40%),
                                radial-gradient(circle at 60% 80%, rgba(74,222,128,0.15) 0%, transparent 45%)`,
            }}
          />
        </div>

        {/* Leaf accent bar */}
        <div className="h-1 bg-gradient-to-r from-green-600 via-emerald-500 to-lime-400" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400/60 hover:text-emerald-300 transition-colors mb-8"
          >
            ← Back to All Vendors
          </Link>

          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* Logo */}
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-emerald-500/30 bg-emerald-900 shadow-2xl shadow-emerald-500/10 flex-shrink-0">
              <Image
                src={org.imageUrl}
                alt={org.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 112px, 128px"
                priority
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  🌱 Organic Certified
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-lime-500/10 text-lime-300 border border-lime-500/20">
                  ✓ Eco Friendly
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
                {org.name}
              </h1>
              <p className="text-base text-emerald-200/70 max-w-2xl leading-relaxed">
                {metadata.description || 'Your destination for premium plants, organic seeds, and expert botanical care. Growing beauty since day one.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION SECTION ──────────────────────────────────── */}
      <section className="bg-gradient-to-b from-yellow-50 to-green-50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-3xl mb-4 block">🌿</span>
            <h2 className="text-2xl font-bold text-emerald-900 tracking-tight mb-4">
              Growing with Nature, Not Against It
            </h2>
            <p className="text-sm text-emerald-800/70 leading-relaxed">
              Every plant in our collection is nurtured with care using organic methods. 
              We believe in sustainable horticulture that enriches both your space and the planet. 
              From rare tropicals to everyday greens, each specimen is hand-selected for quality.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { icon: '🌱', title: 'Organic Grown', desc: 'No synthetic fertilizers or pesticides. Ever.' },
              { icon: '📦', title: 'Safe Delivery', desc: 'Plants shipped in protective packaging with care instructions.' },
              { icon: '🌍', title: 'Eco Packaging', desc: '100% biodegradable pots and recyclable shipping materials.' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white/80 backdrop-blur-sm border border-green-200/60 rounded-2xl p-6 text-center hover:shadow-lg hover:shadow-green-200/30 transition-all duration-300"
              >
                <span className="text-3xl block mb-3">{feature.icon}</span>
                <h3 className="text-sm font-bold text-emerald-900 mb-1">{feature.title}</h3>
                <p className="text-xs text-emerald-700/70 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANTS COLLECTION ────────────────────────────────── */}
      {plantProducts.length > 0 && (
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="flex items-center gap-3 mb-10">
              <span className="text-xl">🪴</span>
              <h2 className="text-xl font-bold text-emerald-900 tracking-tight">
                Plant Collection
              </h2>
              <span className="text-xs font-mono text-emerald-600/50 ml-2">
                {plantProducts.length} varieties
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {plantProducts.map((product) => {
                const formattedPrice = (product.price / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                });

                return (
                  <div
                    key={product.id}
                    className="group bg-green-50/50 border border-green-200/50 rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-green-100/50 hover:border-green-300/60 transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="h-52 bg-green-100/30 relative overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-green-100 to-emerald-100">
                          🌿
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-sm font-bold text-emerald-900 line-clamp-1 group-hover:text-green-700 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-emerald-700/60 line-clamp-2 mt-1.5 leading-relaxed">
                        {product.description || 'A beautiful addition to your collection.'}
                      </p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-200/40">
                        <span className="text-lg font-extrabold text-emerald-800">{formattedPrice}</span>
                        <button className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors cursor-pointer">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ─────────────────────────────────────────── */}
      {serviceProducts.length > 0 && (
        <section className="bg-emerald-50/50">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="flex items-center gap-3 mb-10">
              <span className="text-xl">🧑‍🌾</span>
              <h2 className="text-xl font-bold text-emerald-900 tracking-tight">
                Dilstar Services
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {serviceProducts.map((service) => {
                const formattedPrice = (service.price / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                });

                return (
                  <div
                    key={service.id}
                    className="flex gap-5 bg-white border border-green-200/50 rounded-2xl p-5 hover:shadow-lg hover:shadow-green-100/30 transition-all duration-300"
                  >
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-green-100">
                      {service.imageUrl ? (
                        <Image src={service.imageUrl} alt={service.name} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🌻</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-emerald-900">{service.name}</h3>
                      <p className="text-xs text-emerald-700/60 mt-1 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-bold text-emerald-800">{formattedPrice}</span>
                        <span className="text-[10px] font-mono text-emerald-600/40 uppercase">per session</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── NEWSLETTER CTA ───────────────────────────────────── */}
      <section className="bg-gradient-to-r from-emerald-700 to-green-600">
        <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              🌸 Get seasonal planting tips & new arrivals
            </h2>
            <p className="text-sm text-emerald-100/70 mt-1">
              Join our growing community of plant lovers. No spam, just green goodness.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <input
              type="email"
              placeholder="your@email.com"
              className="h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-white/30 w-64"
              readOnly
            />
            <button className="h-12 px-6 rounded-xl bg-white hover:bg-emerald-50 text-sm font-bold text-emerald-700 transition-colors cursor-pointer">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <section className="bg-emerald-950">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src={org.imageUrl} alt={org.name} width={32} height={32} className="rounded-full" />
            <span className="text-xs font-semibold text-emerald-400">{org.name}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-emerald-600">
            {metadata.address && <span>📍 {metadata.address}</span>}
            {metadata.phone && <span>📞 {metadata.phone}</span>}
            <span>© 2026 {org.name}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
