"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Wrench,
  Sprout,
  Smartphone,
  WrenchIcon,
  Store,
  MapPin,
  HeartHandshake,
  ArrowDown,
} from "lucide-react";
import { AnimatedCounter } from "./MotionWrapper";
import { DILSTAR_MEDIA } from "../data/media";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const headlinePhrases = ["One name.", "Four shops.", "Everything close to home."];

  return (
    <section className="relative min-h-[90vh] sm:min-h-screen flex flex-col justify-center items-center px-6 sm:px-12 lg:px-24 overflow-hidden bg-[#04060a]">
      {/* ── BACKGROUND MEDIA & ATMOSPHERIC GLOW ── */}
      <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
        {/* Subtle Ken Burns Zoom Image Backdrop */}
        <div className="absolute inset-0 scale-105 animate-[kenburns_24s_ease-in-out_infinite_alternate]">
          <Image
            src={DILSTAR_MEDIA.hero.posterSrc}
            alt={DILSTAR_MEDIA.hero.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-30"
          />
        </div>

        {/* 75% Dark Gradient Overlay ensuring crisp typography contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#04060a]/85 via-[#04060a]/75 to-[#04060a]" />

        {/* Signature Drifting Electric Blue -> Deep Teal Gradient Orbs */}
        <div
          className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-[#1565D8]/20 via-[#0d9488]/15 to-transparent blur-3xl animate-[pulse_10s_ease-in-out_infinite]"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tl from-[#0d9488]/20 via-[#1565D8]/10 to-transparent blur-3xl animate-[pulse_12s_ease-in-out_infinite_2s]"
          aria-hidden="true"
        />

        {/* Fine background grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"
          aria-hidden="true"
        />
      </div>

      {/* ── CENTRAL HERO CONTENT ── */}
      <div className="relative max-w-5xl w-full mx-auto flex flex-col items-center text-center pt-24 sm:pt-28 pb-16 z-10">
        {/* Established Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal-500/20 bg-teal-950/40 backdrop-blur-md mb-8 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-teal-300 font-semibold">
            Ambalantota, Sri Lanka • Trusted Local Group
          </span>
        </div>

        {/* ── CINEMATIC HEADLINE REVEAL ── */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] sm:leading-[1.08] max-w-3xl">
          {headlinePhrases.map((phrase, idx) => (
            <span
              key={phrase}
              className={`block overflow-hidden transition-all duration-1000 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${150 + idx * 220}ms`,
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {idx === 2 ? (
                <span className="bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  {phrase}
                </span>
              ) : idx === 1 ? (
                <span className="bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#2dd4bf] bg-clip-text text-transparent">
                  {phrase}
                </span>
              ) : (
                phrase
              )}
            </span>
          ))}
        </h1>

        {/* ── SUBHEADLINE (APPEARING AFTER HEADLINE SETTLES) ── */}
        <p
          className={`mt-6 sm:mt-8 text-base sm:text-lg text-zinc-400 max-w-xl font-normal leading-relaxed transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{
            transitionDelay: "850ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Your dependable local destination for hardware, coconut saplings, mobile electronics, and
          expert technical services — all in Ambalantota.
        </p>

        {/* ── SIGNATURE VISUAL: 4 CONNECTED GLOWING NODES (DIRECT STOREFRONT NAVIGATION) ── */}
        <div
          className={`mt-12 sm:mt-14 w-full max-w-2xl px-4 transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{
            transitionDelay: "1100ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="relative flex items-center justify-between">
            {/* Animated Connecting Line with Looping Light Pulse */}
            <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-[1px] bg-gradient-to-r from-slate-700/60 via-teal-500/40 to-slate-700/60 -z-10 overflow-hidden">
              {/* Continuous looping energy beam traveling between nodes */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent w-28 sm:w-40 animate-[shimmer_3s_infinite_linear]" />
            </div>

            {/* Node 1: Hardware */}
            <Link
              href="/vendors/dilstar-hardware"
              className="group flex flex-col items-center focus:outline-none transition-transform hover:-translate-y-1"
            >
              <div
                style={{
                  clipPath:
                    "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
                }}
                className="relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 bg-zinc-900/95 border border-slate-700/80 shadow-lg group-hover:border-slate-400 group-hover:shadow-[0_0_24px_rgba(148,163,184,0.35)] transition-all duration-300 backdrop-blur-md"
              >
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300 group-hover:text-white transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-slate-400 ring-4 ring-[#04060a]" />
              </div>
              <span className="mt-2.5 text-[11px] sm:text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors tracking-wide">
                Hardware
              </span>
            </Link>

            {/* Node 2: Nursery */}
            <Link
              href="/vendors/dilstar-nursery"
              className="group flex flex-col items-center focus:outline-none transition-transform hover:-translate-y-1"
            >
              <div
                style={{
                  clipPath:
                    "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
                }}
                className="relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 bg-zinc-900/95 border border-emerald-800/80 shadow-lg group-hover:border-emerald-400 group-hover:shadow-[0_0_28px_rgba(16,185,129,0.4)] transition-all duration-300 backdrop-blur-md"
              >
                <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 ring-4 ring-[#04060a] animate-pulse" />
              </div>
              <span className="mt-2.5 text-[11px] sm:text-xs font-semibold text-emerald-300/90 group-hover:text-emerald-300 transition-colors tracking-wide">
                Nursery
              </span>
            </Link>

            {/* Node 3: Tech Shop */}
            <Link
              href="/vendors/dilstar-tech"
              className="group flex flex-col items-center focus:outline-none transition-transform hover:-translate-y-1"
            >
              <div
                style={{
                  clipPath:
                    "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
                }}
                className="relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 bg-zinc-900/95 border border-cyan-800/80 shadow-lg group-hover:border-cyan-400 group-hover:shadow-[0_0_28px_rgba(6,182,212,0.4)] transition-all duration-300 backdrop-blur-md"
              >
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 ring-4 ring-[#04060a]" />
              </div>
              <span className="mt-2.5 text-[11px] sm:text-xs font-semibold text-cyan-300/90 group-hover:text-cyan-300 transition-colors tracking-wide">
                Tech Shop
              </span>
            </Link>

            {/* Node 4: Services */}
            <Link
              href="/vendors/dilstar-services"
              className="group flex flex-col items-center focus:outline-none transition-transform hover:-translate-y-1"
            >
              <div
                style={{
                  clipPath:
                    "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
                }}
                className="relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 bg-zinc-900/95 border border-amber-800/80 shadow-lg group-hover:border-amber-400 group-hover:shadow-[0_0_28px_rgba(245,158,11,0.4)] transition-all duration-300 backdrop-blur-md"
              >
                <WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 ring-4 ring-[#04060a]" />
              </div>
              <span className="mt-2.5 text-[11px] sm:text-xs font-semibold text-amber-300/90 group-hover:text-amber-300 transition-colors tracking-wide">
                Services
              </span>
            </Link>
          </div>
        </div>

        {/* ── THREE COMPACT STAT CHIPS ── */}
        <div
          className={`mt-14 sm:mt-16 flex flex-wrap items-center justify-center gap-3 sm:gap-4 transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{
            transitionDelay: "1350ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Stat 1: 4 Specialized Shops */}
          <div
            style={{
              clipPath:
                "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-sm"
          >
            <Store className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs sm:text-sm font-semibold text-white">
              <AnimatedCounter value={4} durationMs={1200} /> Shops
            </span>
          </div>

          {/* Stat 2: 1 Ambalantota Location */}
          <div
            style={{
              clipPath:
                "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs sm:text-sm font-semibold text-white">
              <AnimatedCounter value={1} durationMs={800} /> Location (Ambalantota)
            </span>
          </div>

          {/* Stat 3: 100% Locally Owned */}
          <div
            style={{
              clipPath:
                "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-sm"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold text-white">
              <AnimatedCounter value={100} durationMs={1800} />% Locally Owned
            </span>
          </div>
        </div>

        {/* ── DOWNWARD SCROLL CUE ── */}
        <div
          className={`mt-14 sm:mt-16 transition-all duration-1000 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "1600ms" }}
        >
          <a
            href="#takeover"
            className="group flex flex-col items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
            aria-label="Scroll to shop showcase"
          >
            <span className="uppercase tracking-widest text-[10px]">Scroll to Explore</span>
            <div className="w-5 h-8 rounded-full border border-zinc-700 flex items-start justify-center p-1">
              <ArrowDown className="w-3 h-3 text-teal-400 animate-bounce" />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
