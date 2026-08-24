"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
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
    <section className="relative min-h-[92vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-8 pb-16">
      {/* ── HERO BACKGROUND MEDIA (KEN BURNS EFFECT + 75% DARK GRADIENT OVERLAY) ── */}
      {/* [PLACEHOLDER: replace with real workshop / store video or high-res photo in DILSTAR_MEDIA.hero] */}
      <div
        className="absolute inset-0 overflow-hidden -z-30 pointer-events-none"
        aria-hidden="true"
      >
        <Image
          src={DILSTAR_MEDIA.hero.posterSrc}
          alt={DILSTAR_MEDIA.hero.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-25 scale-105 animate-[pulse_14s_ease-in-out_infinite_alternate]"
        />
        {/* Dark gradient overlays (60-80% dark) ensuring crisp text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#04060a]/95 via-[#04060a]/80 to-[#04060a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#04060a_85%)]" />
      </div>

      {/* ── DRIFTING AMBIENT GLOWING ORBS (BLUE FADING INTO TEAL) ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden -z-10"
        aria-hidden="true"
      >
        {/* Deep electric blue drifting light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-[65%] -translate-y-1/2 w-[340px] sm:w-[580px] lg:w-[720px] h-[340px] sm:h-[580px] lg:h-[720px] bg-gradient-to-tr from-[#1565D8]/22 via-[#1565D8]/10 to-transparent rounded-full blur-[100px] animate-[pulse_9s_ease-in-out_infinite]" />

        {/* Deep teal drifting accent */}
        <div className="absolute top-1/3 left-1/2 translate-x-[15%] -translate-y-1/3 w-[300px] sm:w-[520px] lg:w-[660px] h-[300px] sm:h-[520px] lg:h-[660px] bg-gradient-to-bl from-[#0d9488]/20 via-[#0B4F5C]/15 to-transparent rounded-full blur-[100px] animate-[pulse_11s_ease-in-out_infinite_2.5s]" />

        {/* Fine grid texture overlay like looking into a control room at night */}
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,#000_70%,transparent_100%)]" />

        {/* Bottom smooth fade to section below */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#04060a] to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
        {/* Subtle Angular-Cut Location Tag */}
        <div
          style={{
            clipPath:
              "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
          }}
          className={`inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/90 border border-zinc-800 text-zinc-400 text-xs font-medium tracking-wider uppercase mb-6 sm:mb-8 backdrop-blur-md transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse" />
          <span>Ambalantota, Sri Lanka</span>
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

        {/* ── SIGNATURE VISUAL: 4 CONNECTED GLOWING NODES ── */}
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
            <a
              href="#hardware"
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
            </a>

            {/* Node 2: Nursery */}
            <a
              href="#nursery"
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
            </a>

            {/* Node 3: Tech Shop */}
            <a
              href="#tech"
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
            </a>

            {/* Node 4: Services */}
            <a
              href="#services"
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
            </a>
          </div>
        </div>

        {/* ── THREE ANGULAR-CUT STAT CHIPS (COUNTING UP SMOOTHLY) ── */}
        <div
          className={`mt-12 sm:mt-14 flex flex-wrap items-center justify-center gap-3 sm:gap-4 transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{
            transitionDelay: "1300ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              clipPath:
                "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-md text-xs text-zinc-300 hover:border-zinc-700 transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-bold text-white text-sm">
              <AnimatedCounter value={4} />
            </span>
            <span className="text-zinc-400">Shops</span>
          </div>

          <div
            style={{
              clipPath:
                "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-md text-xs text-zinc-300 hover:border-zinc-700 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-bold text-white text-sm">
              <AnimatedCounter value={1} />
            </span>
            <span className="text-zinc-400">Location (Ambalantota)</span>
          </div>

          <div
            style={{
              clipPath:
                "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-md text-xs text-zinc-300 hover:border-zinc-700 transition-colors"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-bold text-white text-sm">
              <AnimatedCounter value={100} suffix="%" />
            </span>
            <span className="text-zinc-400">Locally Owned</span>
          </div>
        </div>

        {/* ── SUBTLE DOWNWARD SCROLL CUE TO TAKEOVER ── */}
        <a
          href="#takeover"
          className={`mt-14 sm:mt-16 inline-flex flex-col items-center gap-2 text-xs font-mono tracking-widest text-zinc-500 hover:text-zinc-300 transition-all duration-700 uppercase ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            transitionDelay: "1500ms",
          }}
        >
          <span>Scroll to explore shops</span>
          <ArrowDown className="w-3.5 h-3.5 animate-bounce text-teal-400" />
        </a>
      </div>
    </section>
  );
}
