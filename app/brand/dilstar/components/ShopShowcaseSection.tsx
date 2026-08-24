"use client";

import React from "react";
import { ScrollReveal } from "./MotionWrapper";
import {
  Wrench,
  Sprout,
  Smartphone,
  ArrowRight,
  Sparkles,
  Zap,
  Droplets,
  PaintBucket,
  Hammer,
  ShieldCheck,
  TreePine,
  Sun,
  Layers,
  Cable,
  Headphones,
  BatteryCharging,
  HelpCircle,
} from "lucide-react";

export function ShopShowcaseSection() {
  const hardwareBadges = [
    { label: "Power & hand tools", icon: Hammer },
    { label: "Building materials", icon: Layers },
    { label: "Plumbing & piping", icon: Droplets },
    { label: "Electrical supplies", icon: Zap },
    { label: "Paints & finishes", icon: PaintBucket },
    { label: "Fasteners & fixings", icon: ShieldCheck },
  ];

  const nurseryBadges = [
    { label: "Coconut saplings", icon: Sprout },
    { label: "High-yield stock", icon: TreePine },
    { label: "Organic nutrients", icon: Sun },
    { label: "Planting guidance", icon: Sparkles },
    { label: "Potting mix & soil", icon: Layers },
    { label: "Seasonal garden stock", icon: ShieldCheck },
  ];

  const techBadges = [
    { label: "Mobile phones", icon: Smartphone },
    { label: "Chargers & cables", icon: Cable },
    { label: "Audio & earphones", icon: Headphones },
    { label: "Screen protection", icon: ShieldCheck },
    { label: "Power banks", icon: BatteryCharging },
    { label: "Honest tech guidance", icon: HelpCircle },
  ];

  return (
    <section id="showcase" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-20 sm:space-y-28">
        {/* ═════════════════════════════════════════════════════════════
            PANEL 1: HARDWARE (STEEL / GRAPHITE MOOD)
            ═════════════════════════════════════════════════════════════ */}
        <div id="hardware" className="scroll-mt-24">
          <ScrollReveal direction="up">
            <div className="group relative rounded-3xl bg-zinc-950/85 border border-slate-800/80 hover:border-slate-600/90 p-8 sm:p-12 lg:p-14 overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_0_60px_rgba(148,163,184,0.18)] backdrop-blur-xl">
              {/* Steel / Graphite ambient glow and sharp geometric grid lines */}
              <div
                className="absolute top-0 right-0 w-[420px] h-[420px] bg-gradient-to-bl from-slate-500/15 via-zinc-700/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10 transition-opacity duration-500 group-hover:opacity-100 opacity-70"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-slate-900/30 to-transparent rounded-full blur-2xl pointer-events-none -z-10"
                aria-hidden="true"
              />

              {/* Sharp geometric grid accent */}
              <div
                className="absolute top-0 right-0 w-48 h-48 opacity-[0.06] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:1.25rem_1.25rem] pointer-events-none"
                aria-hidden="true"
              />

              <div className="flex flex-col space-y-6">
                {/* Department Index & Badge */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 text-xs font-semibold tracking-wide">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    <span>01 / Hardware Department</span>
                  </div>
                  <span className="text-4xl sm:text-6xl font-black font-mono tracking-tighter text-slate-800/80 group-hover:text-slate-700/90 select-none transition-colors">
                    01
                  </span>
                </div>

                {/* Shop Title */}
                <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  Dilstar Hardware
                </h3>

                {/* Single Tight Description Line */}
                <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl">
                  Dependable tools and materials for home repairs and contractor builds.
                </p>

                {/* Staggered Capability Badges */}
                <div className="pt-3">
                  <div className="flex flex-wrap gap-2.5 sm:gap-3">
                    {hardwareBadges.map((badge, idx) => {
                      const Icon = badge.icon;
                      return (
                        <span
                          key={badge.label}
                          style={{
                            transitionDelay: `${idx * 80}ms`,
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-slate-800 text-slate-200 text-xs font-medium tracking-wide shadow-sm hover:border-slate-600 hover:bg-slate-900/90 hover:text-white transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* View Location Link with shifting arrow on hover */}
                <div className="pt-4 flex items-center">
                  <a
                    href="#locations"
                    className="group/link inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <span>View location</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/link:text-white transition-transform duration-300 group-hover/link:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            PANEL 2: NURSERY (WARM EMERALD GLOW & BOTANICAL CONTRAST)
            ═════════════════════════════════════════════════════════════ */}
        <div id="nursery" className="scroll-mt-24">
          <ScrollReveal direction="up">
            <div className="group relative rounded-3xl bg-zinc-950/85 border border-emerald-900/50 hover:border-emerald-600/80 p-8 sm:p-12 lg:p-14 overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_0_70px_rgba(16,185,129,0.22)] backdrop-blur-xl">
              {/* Warm Emerald Ambient Glow */}
              <div
                className="absolute top-0 right-0 w-[440px] h-[440px] bg-gradient-to-bl from-emerald-600/22 via-teal-700/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 transition-opacity duration-500 group-hover:opacity-100 opacity-70"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-950/40 to-transparent rounded-full blur-2xl pointer-events-none -z-10"
                aria-hidden="true"
              />

              {/* Floating soft organic pollen / light specks drift */}
              <div
                className="absolute inset-0 pointer-events-none -z-10 overflow-hidden"
                aria-hidden="true"
              >
                <span className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-emerald-400/50 rounded-full blur-[1px] animate-[pulse_4s_ease-in-out_infinite]" />
                <span className="absolute top-2/3 right-1/3 w-2 h-2 bg-teal-400/40 rounded-full blur-[1px] animate-[pulse_6s_ease-in-out_infinite_1s]" />
                <span className="absolute bottom-1/4 right-1/2 w-1 h-1 bg-emerald-300/60 rounded-full blur-[0.5px] animate-[pulse_5s_ease-in-out_infinite_2s]" />
              </div>

              <div className="flex flex-col space-y-6">
                {/* Department Index & Badge */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold tracking-wide">
                    <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                    <span>02 / Nursery Department</span>
                  </div>
                  <span className="text-4xl sm:text-6xl font-black font-mono tracking-tighter text-emerald-950/90 group-hover:text-emerald-900 select-none transition-colors">
                    02
                  </span>
                </div>

                {/* Shop Title */}
                <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  Dilstar Nursery
                </h3>

                {/* Single Tight Description Line */}
                <p className="text-base sm:text-lg text-emerald-300/90 font-medium leading-relaxed max-w-2xl">
                  Healthy coconut saplings and honest planting guidance, grown for
                  Ambalantota&apos;s soil.
                </p>

                {/* Staggered Capability Badges */}
                <div className="pt-3">
                  <div className="flex flex-wrap gap-2.5 sm:gap-3">
                    {nurseryBadges.map((badge, idx) => {
                      const Icon = badge.icon;
                      return (
                        <span
                          key={badge.label}
                          style={{
                            transitionDelay: `${idx * 80}ms`,
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-emerald-900/40 text-emerald-100 text-xs font-medium tracking-wide shadow-sm hover:border-emerald-600 hover:bg-emerald-950/60 hover:text-white transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <Icon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* View Location Link with shifting arrow on hover */}
                <div className="pt-4 flex items-center">
                  <a
                    href="#locations"
                    className="group/link inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>View location</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400 group-hover/link:text-emerald-300 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            PANEL 3: TECH SHOP (ELECTRIC BLUE TO DEEP TEAL GRADIENT)
            ═════════════════════════════════════════════════════════════ */}
        <div id="tech" className="scroll-mt-24">
          <ScrollReveal direction="up">
            <div className="group relative rounded-3xl bg-zinc-950/85 border border-cyan-900/50 hover:border-cyan-600/80 p-8 sm:p-12 lg:p-14 overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_0_70px_rgba(6,182,212,0.22)] backdrop-blur-xl">
              {/* Electric Blue to Deep Teal Ambient Glow */}
              <div
                className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-bl from-[#1565D8]/22 via-[#0d9488]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 transition-opacity duration-500 group-hover:opacity-100 opacity-70"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#0B4F5C]/35 to-transparent rounded-full blur-2xl pointer-events-none -z-10"
                aria-hidden="true"
              />

              {/* Subtle circuit-line tech accents */}
              <div
                className="absolute top-0 right-0 w-64 h-64 opacity-[0.07] pointer-events-none overflow-hidden"
                aria-hidden="true"
              >
                <svg
                  className="w-full h-full text-cyan-400"
                  viewBox="0 0 200 200"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M 10 100 L 80 100 L 120 140 L 190 140" strokeWidth="1.5" />
                  <path d="M 30 40 L 100 40 L 140 80 L 190 80" strokeWidth="1.5" />
                  <circle cx="10" cy="100" r="3" fill="currentColor" />
                  <circle cx="190" cy="140" r="3" fill="currentColor" />
                  <circle cx="30" cy="40" r="3" fill="currentColor" />
                  <circle cx="190" cy="80" r="3" fill="currentColor" />
                </svg>
              </div>

              <div className="flex flex-col space-y-6">
                {/* Department Index & Badge */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-semibold tracking-wide">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>03 / Tech Department</span>
                  </div>
                  <span className="text-4xl sm:text-6xl font-black font-mono tracking-tighter text-cyan-950/90 group-hover:text-cyan-900 select-none transition-colors">
                    03
                  </span>
                </div>

                {/* Shop Title */}
                <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  Dilstar Tech Shop
                </h3>

                {/* Single Tight Description Line */}
                <p className="text-base sm:text-lg text-cyan-300/90 font-medium leading-relaxed max-w-2xl">
                  Phones, electronics, and honest advice — no jargon, no pressure.
                </p>

                {/* Staggered Capability Badges */}
                <div className="pt-3">
                  <div className="flex flex-wrap gap-2.5 sm:gap-3">
                    {techBadges.map((badge, idx) => {
                      const Icon = badge.icon;
                      return (
                        <span
                          key={badge.label}
                          style={{
                            transitionDelay: `${idx * 80}ms`,
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-cyan-900/40 text-cyan-100 text-xs font-medium tracking-wide shadow-sm hover:border-cyan-500 hover:bg-cyan-950/60 hover:text-white transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* View Location Link with shifting arrow on hover */}
                <div className="pt-4 flex items-center">
                  <a
                    href="#locations"
                    className="group/link inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>View location</span>
                    <ArrowRight className="w-4 h-4 text-cyan-400 group-hover/link:text-cyan-300 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
