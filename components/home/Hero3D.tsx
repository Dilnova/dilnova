'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Package, ShieldCheck, Zap } from 'lucide-react';

export default function Hero3D() {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // max 10 deg
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    if (!prefersReducedMotion) {
      setRotation({ x: 0, y: 0 });
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-zinc-950 text-white min-h-[80vh] flex items-center pt-16 pb-12">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left: Content */}
        <div className="space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Multi-Tenant Architecture
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              One Hub. <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Every Store.
              </span>
            </h1>
            <p className="text-base md:text-lg text-zinc-400 max-w-lg leading-relaxed">
              Explore the premier B2B and retail commerce platform. Discover curated first-party storefronts or join thousands of marketplace vendors scaling on our infrastructure.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/vendors"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98]"
            >
              Explore Marketplace
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold border border-zinc-700 transition-all duration-200 hover:border-zinc-600 active:scale-[0.98]"
            >
              Register Your Store
            </Link>
          </div>
          
          <div className="pt-4 flex items-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Grade</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              <span>Unified Cart</span>
            </div>
          </div>
        </div>

        {/* Right: CSS 3D Scene */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative h-[400px] lg:h-[500px] w-full hidden md:flex items-center justify-center"
          style={{ perspective: '1000px' }}
        >
          <div 
            className="w-full h-full relative transition-transform duration-200 ease-out"
            style={{ 
              transformStyle: 'preserve-3d',
              transform: prefersReducedMotion 
                ? 'none' 
                : `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` 
            }}
          >
            {/* Main Floating Card */}
            <div 
              className="absolute top-1/2 left-1/2 w-64 h-80 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center gap-6"
              style={{ transform: 'translate(-50%, -50%) translateZ(50px)' }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Package className="w-10 h-10 text-white" />
              </div>
              <div className="text-center space-y-2">
                <div className="h-2 w-24 bg-zinc-700 rounded-full mx-auto" />
                <div className="h-2 w-16 bg-zinc-800 rounded-full mx-auto" />
              </div>
            </div>

            {/* Floating Element 1 */}
            <div 
              className="absolute top-[20%] left-[10%] w-32 h-32 bg-emerald-900/40 backdrop-blur-md border border-emerald-500/30 rounded-xl shadow-xl p-4 flex flex-col justify-between"
              style={{ transform: 'translateZ(80px)' }}
            >
               <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                 <Zap className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="h-1.5 w-12 bg-emerald-800 rounded-full" />
            </div>

            {/* Floating Element 2 */}
            <div 
              className="absolute bottom-[20%] right-[10%] w-40 h-24 bg-amber-900/40 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-xl p-4 flex flex-col justify-between"
              style={{ transform: 'translateZ(120px)' }}
            >
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-amber-500/20" />
                <div className="w-6 h-6 rounded bg-amber-500/20" />
              </div>
              <div className="h-1.5 w-20 bg-amber-800 rounded-full" />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
