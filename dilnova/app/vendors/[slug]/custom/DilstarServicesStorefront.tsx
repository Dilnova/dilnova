import Link from 'next/link';
import Image from 'next/image';
import type { StorefrontProps } from './types';
import { isVideoUrl } from '@/utils/media';

/**
 * ═══════════════════════════════════════════════════════════════
 * DILSTAR SERVICES — Custom Storefront
 * ═══════════════════════════════════════════════════════════════
 * Premium slate/teal consulting theme featuring clean typography,
 * interactive consulting cards, verified expert reviews, and scheduling sections.
 * ═══════════════════════════════════════════════════════════════
 */
export default function DilstarServicesStorefront({ org, products }: StorefrontProps) {
  const metadata = org.publicMetadata;

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 font-sans"
      style={{
        '--srv-primary': '#0D9488', // Teal 600
        '--srv-primary-hover': '#0F766E', // Teal 700
        '--srv-surface': '#0F172A', // Slate 900
        '--srv-surface-light': '#1E293B', // Slate 800
        '--srv-text': '#F8FAFC',
        '--srv-text-muted': '#94A3B8',
      } as React.CSSProperties}
    >
      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-900 bg-gradient-to-b from-teal-950/20 via-slate-950 to-slate-950">
        {/* Soft grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: 'linear-gradient(rgba(13, 148, 136, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.08) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
        </div>

        {/* Teal gradient accent line */}
        <div className="h-[2px] bg-gradient-to-r from-teal-500 via-emerald-500 to-slate-800" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-teal-400 transition-colors mb-8"
          >
            ← Back to All Portals
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Logo */}
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-teal-500/30 bg-slate-900 shadow-2xl shadow-teal-500/5 flex-shrink-0">
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
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Professional Services
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Verified Experts
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
                {org.name}
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                {metadata.description || 'Schedule consultation calls with master gardeners, custom project builders, tech architects, and heavy machinery operators.'}
              </p>
            </div>
          </div>

          {/* Stats details */}
          <div className="mt-10 flex flex-wrap gap-8 border-t border-slate-900/60 pt-8 text-xs text-slate-500 font-mono">
            <div>
              SERVICES_ACTIVE: <span className="text-teal-400 font-semibold text-sm">{products.length}</span>
            </div>
            <div>
              SATISFACTION_RATE: <span className="text-teal-400 font-semibold text-sm">99.2%</span>
            </div>
            <div>
              RESPONSE_TIME: <span className="text-teal-400 font-semibold text-sm">&lt; 2 Hours</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE CAPABILITIES ─────────────────────────────────── */}
      <section className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-5 bg-teal-500 rounded-full" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Primary Service Categories
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🪴', label: 'Landscaping Care', desc: 'Planting & nursery setups' },
              { icon: '🔧', label: 'Equipment Repair', desc: 'Hardware diagnostics' },
              { icon: '🖥️', label: 'Tech Architecture', desc: 'Workstation deployment' },
              { icon: '📅', label: 'Site Consultations', desc: 'On-site inspections' },
            ].map((cat) => (
              <div
                key={cat.label}
                className="group relative bg-[#0f172a] border border-slate-800 rounded-xl p-5 hover:border-teal-500/40 hover:bg-[#1e293b] transition-all duration-300 cursor-pointer"
              >
                <span className="text-2xl block mb-3">{cat.icon}</span>
                <h3 className="text-xs font-bold text-white mb-0.5">{cat.label}</h3>
                <p className="text-[10px] text-slate-500 leading-snug">{cat.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICE BOOKING LISTING ────────────────────────────── */}
      <section className="bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-teal-500 rounded-full" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Available Consulting Packages
              </h2>
              <span className="text-xs text-slate-600 font-mono ml-2">
                ({products.length} active service packages)
              </span>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 border border-slate-900 rounded-2xl bg-[#0f172a]/30 text-xs text-slate-500">
              No services packages listed yet.
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
                    className="group relative bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 flex flex-col justify-between"
                  >
                    <Link href={`/products/${product.id}`} target="_blank" className="flex-1 flex flex-col">
                      {/* Product Image */}
                      <div className="h-48 bg-slate-900 relative overflow-hidden border-b border-slate-800">
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
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-950 text-[10px]">
                            <span>[NO_MEDIA]</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-slate-800 text-[10px] font-mono text-teal-400 font-semibold uppercase tracking-wider">
                          Service
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                            SERVICE_ID // {product.id.slice(0, 8)}
                          </span>
                          <h3 className="font-bold text-slate-200 group-hover:text-teal-400 transition-colors text-sm tracking-tight leading-snug line-clamp-2">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-900 flex items-center justify-between">
                          <span className="text-sm font-extrabold text-teal-400">
                            {formattedPrice}
                          </span>
                          <span className="text-[10px] text-teal-400 group-hover:translate-x-1 transition-transform">
                            Request Quote →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
