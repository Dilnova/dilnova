import Link from "next/link";
import Image from "next/image";
import type { StorefrontProps } from "./types";
import { isVideoUrl } from "@/shared/media/media";
import AddToCartButton from "@/features/cart/components/AddToCartButton";

/**
 * ═══════════════════════════════════════════════════════════════
 * DISTAR TECH STORE — Custom Storefront
 * ═══════════════════════════════════════════════════════════════
 * Futuristic tech/cyberpunk theme featuring deep indigo/violet background,
 * neon cyan/violet accents, monospace stats, and digital grid aesthetics.
 * ═══════════════════════════════════════════════════════════════
 */
export default function DistarTechStorefront({ org, products }: StorefrontProps) {
  const metadata = org.publicMetadata;

  return (
    <div className="min-h-screen font-sans bg-zinc-950 text-zinc-100">
      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-zinc-950 to-zinc-950">
        {/* Futuristic Cyber Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        {/* Neon laser line at top */}
        <div className="h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-indigo-500 animate-pulse" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-500 hover:text-cyan-400 transition-colors mb-8"
          >
            &lt;// BACK_TO_ALL_VENDORS
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Logo with cyber-border */}
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-cyan-500/50 bg-zinc-900 shadow-2xl shadow-cyan-500/10 flex-shrink-0">
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
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  SYS.STATUS: ONLINE
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest bg-purple-950 text-purple-400 border border-purple-500/30">
                  SECURE_VERIFIED
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 font-mono">
                {org.name}
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                {metadata.description ||
                  "Enterprise workstations, developer-grade components, network gear, IoT setups, and high-performance server accessories."}
              </p>
            </div>
          </div>

          {/* Monospace stats */}
          <div className="mt-10 flex flex-wrap gap-8 border-t border-zinc-900 pt-8 font-mono text-xs text-zinc-400">
            <div>
              <span className="text-zinc-500">&gt;_ LISTINGS:</span>{" "}
              <span className="text-cyan-400 font-bold text-sm">{products.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">&gt;_ SERVICES:</span>{" "}
              <span className="text-cyan-400 font-bold text-sm">
                {products.filter((p) => p.type === "service").length}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">&gt;_ NET_RATING:</span>{" "}
              <span className="text-purple-400 font-bold text-sm">5.0 / 5.0</span>
            </div>
            <div>
              <span className="text-zinc-500">&gt;_ TOTAL_NODES:</span>{" "}
              <span className="text-zinc-300 font-bold text-sm">342+</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGH TECH SPEC SHOWCASE ──────────────────────────── */}
      <section className="bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-5 bg-cyan-500 rounded-full" />
            <h2 className="text-lg font-bold text-white tracking-tight font-mono">
              System Core Categories
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "💻", label: "Workstations", count: products.length },
              { icon: "💾", label: "Memory & Storage", count: 0 },
              { icon: "🔌", label: "IoT Dev Kits", count: 0 },
              { icon: "🌐", label: "Server Hardware", count: 0 },
            ].map((cat) => (
              <div
                key={cat.label}
                className="group relative bg-[#0b0f19] border border-zinc-800 rounded-xl p-5 hover:border-cyan-500/40 hover:bg-[#111827] transition-all duration-300 cursor-pointer"
              >
                <span className="text-2xl block mb-3">{cat.icon}</span>
                <h3 className="text-xs font-mono font-bold text-white mb-0.5">{cat.label}</h3>
                <span className="text-[10px] font-mono text-zinc-500">{cat.count} nodes</span>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS GRID ────────────────────────────────────── */}
      <section className="bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-5 bg-cyan-500 rounded-full" />
              <h2 className="text-lg font-bold text-white tracking-tight font-mono">
                Hardware Node Catalog
              </h2>
              <span className="text-[11px] font-mono text-zinc-600 ml-2">
                [{products.length} node(s) query_success]
              </span>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 border border-zinc-900 rounded-2xl bg-[#0b0f19]/30 font-mono text-xs text-zinc-500">
              [SYSTEM_ERR] No catalog items resolved.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const formattedPrice = (product.price / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                });

                return (
                  <div
                    key={product.id}
                    className="group relative bg-[#0b0f19] border border-zinc-800 rounded-xl overflow-hidden hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 flex flex-col justify-between"
                  >
                    <Link
                      href={`/products/${product.id}`}
                      className="flex-1 flex flex-col group/item"
                    >
                      {/* Product Image */}
                      <div className="h-48 bg-zinc-900 relative overflow-hidden border-b border-zinc-800">
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
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-zinc-950 font-mono text-[10px]">
                            <span>[NO_MEDIA]</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-zinc-800 text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                          {product.type}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wider">
                            ID // {product.id.slice(0, 8)}...
                          </span>
                          <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors text-sm font-mono tracking-tight leading-snug line-clamp-2">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="px-5 pb-5 flex items-center justify-between border-t border-zinc-900 pt-4">
                      <span className="text-sm font-mono font-extrabold text-cyan-400">
                        {formattedPrice}
                      </span>
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
                          className="h-8 w-8 text-xs rounded-lg border-zinc-700 bg-zinc-950 hover:bg-zinc-900"
                        />
                        <Link
                          href={`/products/${product.id}`}
                          className="text-[10px] font-mono text-zinc-500 hover:text-cyan-400 transition-colors"
                        >
                          details // &gt;
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
    </div>
  );
}
