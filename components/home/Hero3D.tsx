'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Package, ShieldCheck, Zap, Wrench, Leaf, Cpu, Briefcase, Store } from 'lucide-react';

export default function Hero3D() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const updateTransforms = (x: number, y: number) => {
    if (prefersReducedMotion) return;
    if (bgRef.current) bgRef.current.style.transform = `translate3d(${x * -10}px, ${y * -10}px, 0)`;
    if (linesRef.current) linesRef.current.style.transform = `translate3d(${x * -15}px, ${y * -15}px, 0)`;
    if (nodesRef.current) nodesRef.current.style.transform = `translate3d(${x * -20}px, ${y * -20}px, 0)`;
    if (hubRef.current) hubRef.current.style.transform = `translate3d(${x * -35}px, ${y * -35}px, 0)`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    updateTransforms(x, y);
  };

  const handleMouseLeave = () => {
    updateTransforms(0, 0);
  };

  // Store nodes configuration
  const nodes = [
    { id: 'hardware', icon: Wrench, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-400/10', border: 'border-amber-500/30 dark:border-amber-400/20', posClass: 'top-[15%] left-[20%]' },
    { id: 'nursery', icon: Leaf, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/10', border: 'border-emerald-500/30 dark:border-emerald-400/20', posClass: 'top-[25%] right-[15%]' },
    { id: 'tech', icon: Cpu, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 dark:bg-indigo-400/10', border: 'border-indigo-500/30 dark:border-indigo-400/20', posClass: 'bottom-[25%] left-[15%]' },
    { id: 'services', icon: Briefcase, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-500/30 dark:border-teal-400/20', posClass: 'bottom-[20%] right-[25%]' },
    { id: 'vendor1', icon: Store, color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-500/10 dark:bg-zinc-400/10', border: 'border-zinc-500/30 dark:border-zinc-400/20', posClass: 'top-[10%] right-[40%]' },
    { id: 'vendor2', icon: Store, color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-500/10 dark:bg-zinc-400/10', border: 'border-zinc-500/30 dark:border-zinc-400/20', posClass: 'bottom-[10%] left-[40%]' },
  ];

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-[80vh] flex items-center pt-16 pb-12 [perspective:1000px]"
    >
      {/* Background Layer (Moves slightly) - Replaced blobs with restrained dot grid */}
      <div 
        ref={bgRef}
        className={`absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] ${prefersReducedMotion ? '' : 'transition-transform duration-100 ease-out'}`}
      />

      <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left: Content */}
        <div className="space-y-8 z-20">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" /> Multi-Tenant Architecture
            </span>
            {/* High-contrast solid typography with one gradient accent word, dropping full gradient text */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-zinc-900 dark:text-white">
              One Hub. <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-600 to-zinc-800 dark:from-zinc-300 dark:to-zinc-500">
                Every Store.
              </span>
            </h1>
            <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
              Explore the premier B2B and retail commerce platform. Discover curated first-party storefronts or join thousands of marketplace vendors scaling on our infrastructure.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/vendors"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold transition-all duration-200 active:scale-[0.98]"
            >
              Explore Marketplace
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-semibold border border-zinc-200 dark:border-zinc-700 transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-600 active:scale-[0.98]"
            >
              Register Your Store
            </Link>
          </div>
          
          <div className="pt-4 flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span>Enterprise Grade</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span>Unified Cart</span>
            </div>
          </div>
        </div>

        {/* Right: Network Parallax Visual */}
        <div className="relative h-[400px] lg:h-[600px] w-full hidden md:block" aria-hidden="true">
          
          {/* SVG Lines Layer (Mid-background speed) */}
          <div 
            ref={linesRef}
            className={`absolute inset-0 z-10 ${prefersReducedMotion ? '' : 'transition-transform duration-100 ease-out'}`}
          >
            <svg className="w-full h-full" preserveAspectRatio="none">
              <g stroke="currentColor" className="text-zinc-900/20 dark:text-white/20" strokeWidth="1.5" strokeDasharray="4 4" fill="none">
                {/* Lines connecting nodes to the center Hub */}
                <line x1="20%" y1="15%" x2="50%" y2="50%" />
                <line x1="85%" y1="25%" x2="50%" y2="50%" />
                <line x1="15%" y1="75%" x2="50%" y2="50%" />
                <line x1="75%" y1="80%" x2="50%" y2="50%" />
                <line x1="60%" y1="10%" x2="50%" y2="50%" />
                <line x1="40%" y1="90%" x2="50%" y2="50%" />
              </g>
            </svg>
          </div>

          {/* Satellite Nodes Layer (Mid-foreground speed) */}
          <div 
            ref={nodesRef}
            className={`absolute inset-0 z-20 ${prefersReducedMotion ? '' : 'transition-transform duration-100 ease-out'}`}
          >
            {nodes.map((node) => {
              const Icon = node.icon;
              return (
                <div 
                  key={node.id} 
                  className={`absolute w-12 h-12 flex items-center justify-center rounded-xl border backdrop-blur-sm ${node.bg} ${node.border} shadow-lg -translate-x-1/2 -translate-y-1/2 ${node.posClass}`}
                >
                  <Icon className={`w-5 h-5 ${node.color}`} />
                </div>
              );
            })}
          </div>

          {/* Central Hub Layer (Foreground speed, moves fastest) */}
          <div 
            ref={hubRef}
            className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none ${prefersReducedMotion ? '' : 'transition-transform duration-100 ease-out'}`}
          >
            <div className="w-24 h-24 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-center backdrop-blur-md relative">
              <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-2xl" />
              <Package className="w-10 h-10 text-zinc-900 dark:text-white" />
              
              {/* Decorative outer rings to reinforce the 'Hub' concept */}
              <div className="absolute -inset-4 border border-zinc-900/10 dark:border-zinc-100/10 rounded-[1.5rem]" />
              <div className="absolute -inset-8 border border-zinc-900/5 dark:border-zinc-100/5 rounded-[2rem]" />
            </div>
          </div>
        </div>

        {/* Mobile Static Fallback Graphic (Shown below md) */}
        <div className="relative h-64 w-full md:hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-800/50 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/20 overflow-hidden" aria-hidden="true">
           {/* Static SVG Lines */}
           <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
             <g stroke="currentColor" className="text-zinc-900/15 dark:text-white/15" strokeWidth="1" strokeDasharray="3 3">
               <line x1="20%" y1="30%" x2="50%" y2="50%" />
               <line x1="80%" y1="30%" x2="50%" y2="50%" />
               <line x1="20%" y1="70%" x2="50%" y2="50%" />
               <line x1="80%" y1="70%" x2="50%" y2="50%" />
             </g>
           </svg>
           {/* Static Hub */}
           <div className="w-16 h-16 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center relative z-10 shadow-lg">
             <Package className="w-6 h-6 text-zinc-900 dark:text-white" />
           </div>
           {/* Static Nodes representing the stores */}
           <div className="absolute top-[20%] left-[10%] w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-400/20 text-amber-600 dark:text-amber-400">
             <Wrench className="w-4 h-4" />
           </div>
           <div className="absolute top-[20%] right-[10%] w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/30 dark:border-emerald-400/20 text-emerald-600 dark:text-emerald-400">
             <Leaf className="w-4 h-4" />
           </div>
           <div className="absolute bottom-[20%] left-[10%] w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-500/30 dark:border-indigo-400/20 text-indigo-600 dark:text-indigo-400">
             <Cpu className="w-4 h-4" />
           </div>
           <div className="absolute bottom-[20%] right-[10%] w-8 h-8 flex items-center justify-center rounded-lg bg-teal-500/10 dark:bg-teal-400/10 border border-teal-500/30 dark:border-teal-400/20 text-teal-600 dark:text-teal-400">
             <Briefcase className="w-4 h-4" />
           </div>
        </div>

      </div>
    </div>
  );
}
