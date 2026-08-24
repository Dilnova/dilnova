"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DILSTAR_MEDIA } from "../data/media";

interface SceneData {
  id: string;
  number: string;
  name: string;
  departmentTitle: string;
  description: string;
  badges: string[];
  imageSrc: string;
  imageAlt: string;
  overlayClass: string;
  accentTextClass: string;
  locationHref: string;
}

const SCENES: SceneData[] = [
  {
    id: "hardware",
    number: "01",
    name: "Dilstar Hardware",
    departmentTitle: "01 \u2014 Department of Industrial & Building Supplies",
    description: "Dependable tools and materials for home repairs and contractor builds.",
    badges: [
      "Power & hand tools",
      "Building materials",
      "Plumbing & piping",
      "Electrical supplies",
      "Paints & finishes",
      "Fasteners & fixings",
    ],
    // [PLACEHOLDER: replace with real hardware shop photo in DILSTAR_MEDIA.hardware]
    imageSrc: DILSTAR_MEDIA.hardware.src,
    imageAlt: DILSTAR_MEDIA.hardware.alt,
    overlayClass: "from-[#04060a]/95 via-[#0f172a]/75 to-[#04060a]/90",
    accentTextClass: "text-slate-400",
    locationHref: "#locations",
  },
  {
    id: "nursery",
    number: "02",
    name: "Dilstar Nursery",
    departmentTitle: "02 \u2014 Department of Botanical & Coconut Saplings",
    description:
      "Healthy coconut saplings and honest planting guidance, grown for Ambalantota's soil.",
    badges: [
      "Coconut saplings",
      "High-yield stock",
      "Organic nutrients",
      "Planting guidance",
      "Potting mix & soil",
      "Seasonal garden stock",
    ],
    // [PLACEHOLDER: replace with real nursery photo in DILSTAR_MEDIA.nursery]
    imageSrc: DILSTAR_MEDIA.nursery.src,
    imageAlt: DILSTAR_MEDIA.nursery.alt,
    overlayClass: "from-[#04060a]/95 via-[#022c22]/75 to-[#04060a]/90",
    accentTextClass: "text-emerald-400",
    locationHref: "#locations",
  },
  {
    id: "tech",
    number: "03",
    name: "Dilstar Tech Shop",
    departmentTitle: "03 \u2014 Department of Phones & Electronics",
    description: "Phones, electronics, and honest advice — no jargon, no pressure.",
    badges: [
      "Mobile phones",
      "Chargers & cables",
      "Audio & earphones",
      "Screen protection",
      "Power banks",
      "Honest tech guidance",
    ],
    // [PLACEHOLDER: replace with real tech shop photo in DILSTAR_MEDIA.tech]
    imageSrc: DILSTAR_MEDIA.tech.src,
    imageAlt: DILSTAR_MEDIA.tech.alt,
    overlayClass: "from-[#04060a]/95 via-[#083344]/75 to-[#04060a]/90",
    accentTextClass: "text-cyan-400",
    locationHref: "#locations",
  },
  {
    id: "services",
    number: "04",
    name: "Dilstar Services",
    departmentTitle: "04 \u2014 Department of Equipment Repairs & Technical Care",
    description:
      "Professional equipment repair, electrical maintenance, and expert technical consultations.",
    badges: [
      "Equipment repairs",
      "Electrical servicing",
      "Motor maintenance",
      "Tool restoration",
      "Planting consultations",
      "On-site assistance",
    ],
    // [PLACEHOLDER: replace with real services photo in DILSTAR_MEDIA.services]
    imageSrc: DILSTAR_MEDIA.services.src,
    imageAlt: DILSTAR_MEDIA.services.alt,
    overlayClass: "from-[#04060a]/95 via-[#291e0a]/75 to-[#04060a]/90",
    accentTextClass: "text-amber-400",
    locationHref: "#locations",
  },
];

export function ShopTakeoverSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsReducedMotion(prefersReducedMotion);

    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollableDistance = rect.height - windowHeight;

      if (totalScrollableDistance <= 0) return;

      const currentScroll = -rect.top;
      const rawProgress = Math.max(0, Math.min(1, currentScroll / totalScrollableDistance));
      setScrollProgress(rawProgress);

      // Determine active scene across 4 shops
      if (rawProgress < 0.25) {
        setActiveSceneIndex(0);
      } else if (rawProgress < 0.5) {
        setActiveSceneIndex(1);
      } else if (rawProgress < 0.75) {
        setActiveSceneIndex(2);
      } else {
        setActiveSceneIndex(3);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Calculate diagonal angular wipe percentages for transitions between 4 scenes
  // Transition 1 (Scene 0 -> Scene 1): occurs between progress ~0.18 and ~0.32
  const t1 = Math.max(0, Math.min(1, (scrollProgress - 0.18) / 0.14));
  const wipe1Top = t1 * 130;
  const wipe1Bottom = Math.max(0, t1 * 130 - 30);

  // Transition 2 (Scene 1 -> Scene 2): occurs between progress ~0.43 and ~0.57
  const t2 = Math.max(0, Math.min(1, (scrollProgress - 0.43) / 0.14));
  const wipe2Top = t2 * 130;
  const wipe2Bottom = Math.max(0, t2 * 130 - 30);

  // Transition 3 (Scene 2 -> Scene 3): occurs between progress ~0.68 and ~0.82
  const t3 = Math.max(0, Math.min(1, (scrollProgress - 0.68) / 0.14));
  const wipe3Top = t3 * 130;
  const wipe3Bottom = Math.max(0, t3 * 130 - 30);

  // Fallback for reduced motion: standard stacked 100vh scenes
  if (isReducedMotion) {
    return (
      <section id="takeover" className="relative w-full">
        {SCENES.map((scene) => (
          <div
            key={scene.id}
            id={scene.id}
            className="relative min-h-screen w-full flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-20 overflow-hidden"
          >
            {/* Full-bleed background */}
            <div className="absolute inset-0 -z-20">
              <Image
                src={scene.imageSrc}
                alt={scene.imageAlt}
                fill
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className={`absolute inset-0 bg-gradient-to-r ${scene.overlayClass}`} />
            </div>

            {/* Content directly on screen (NO boxes / NO cards) */}
            <div className="max-w-4xl space-y-6 z-10">
              <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
                {scene.number} &mdash; {scene.name}
              </span>
              <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight">
                {scene.name}
              </h2>
              <p className="text-lg sm:text-xl text-zinc-200 font-medium max-w-2xl">
                {scene.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-zinc-300 font-medium pt-2">
                {scene.badges.map((badge, idx) => (
                  <React.Fragment key={badge}>
                    <span>{badge}</span>
                    {idx < scene.badges.length - 1 && (
                      <span className="text-zinc-600 font-mono select-none">/</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="pt-6">
                <a
                  href="#locations"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-teal-300 transition-colors"
                >
                  <span>View location</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section id="takeover" ref={containerRef} className="relative w-full h-[420vh] bg-[#04060a]">
      {/* ── STICKY VIEWPORT CONTAINER (100vh FULL-BLEED TAKEOVER) ── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ═════════════════════════════════════════════════════════════
            SCENE 0: HARDWARE (BASE LAYER)
            ═════════════════════════════════════════════════════════════ */}
        <div
          className={`absolute inset-0 w-full h-full flex flex-col justify-center px-6 sm:px-12 lg:px-24 transition-opacity duration-700 ${
            activeSceneIndex === 0 ? "opacity-100" : "opacity-90"
          }`}
        >
          {/* Full-bleed background image */}
          <div className="absolute inset-0 -z-20">
            <Image
              src={SCENES[0].imageSrc}
              alt={SCENES[0].imageAlt}
              fill
              priority
              sizes="100vw"
              style={{
                transform: `scale(${1 + t1 * 0.08})`,
                transition: "transform 0.4s ease-out",
              }}
              className="object-cover object-center"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${SCENES[0].overlayClass}`} />
            <div className="absolute inset-0 bg-[#04060a]/40" />
          </div>

          {/* Large Atmospheric Watermark Number ("01") */}
          <span className="absolute right-8 sm:right-16 top-1/2 -translate-y-1/2 text-[16rem] sm:text-[22rem] lg:text-[28rem] font-black font-mono tracking-tighter text-white/[0.04] select-none pointer-events-none -z-10">
            01
          </span>

          {/* Text Content Directly Over Full Screen */}
          <div
            style={{
              transform: `translateY(${-t1 * 40}px)`,
              opacity: Math.max(0, 1 - t1 * 2),
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="max-w-4xl space-y-6 z-10"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-slate-400 uppercase">
              <span className="w-1.5 h-1.5 bg-slate-400" />
              <span>{SCENES[0].departmentTitle}</span>
            </div>

            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05]">
              {SCENES[0].name}
            </h2>

            <p className="text-lg sm:text-2xl text-slate-200 font-normal leading-relaxed max-w-2xl">
              {SCENES[0].description}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300 font-medium pt-2">
              {SCENES[0].badges.map((badge, idx) => (
                <React.Fragment key={badge}>
                  <span className="hover:text-white transition-colors">{badge}</span>
                  {idx < SCENES[0].badges.length - 1 && (
                    <span className="text-slate-600 font-mono select-none">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-8">
              <a
                href="#locations"
                className="group/link inline-flex items-center gap-2.5 text-sm font-semibold text-white hover:text-slate-300 transition-colors"
              >
                <span>View location</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover/link:text-white transition-transform duration-300 group-hover/link:translate-x-1.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            SCENE 1: NURSERY (DIAGONAL ANGULAR WIPE LAYER 1)
            ═════════════════════════════════════════════════════════════ */}
        <div
          style={{
            clipPath: `polygon(0 0, ${wipe1Top}% 0, ${wipe1Bottom}% 100%, 0 100%)`,
          }}
          className="absolute inset-0 w-full h-full flex flex-col justify-center px-6 sm:px-12 lg:px-24 z-10 overflow-hidden"
        >
          <div className="absolute inset-0 -z-20">
            <Image
              src={SCENES[1].imageSrc}
              alt={SCENES[1].imageAlt}
              fill
              sizes="100vw"
              style={{
                transform: `scale(${1 + t2 * 0.08})`,
                transition: "transform 0.4s ease-out",
              }}
              className="object-cover object-center"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${SCENES[1].overlayClass}`} />
            <div className="absolute inset-0 bg-[#04060a]/35" />
          </div>

          <div
            className="absolute inset-0 pointer-events-none -z-10 overflow-hidden"
            aria-hidden="true"
          >
            <span className="absolute top-1/4 right-1/4 w-2 h-2 bg-emerald-400/60 rounded-full blur-[1px] animate-[pulse_4s_ease-in-out_infinite]" />
            <span className="absolute top-2/3 right-1/3 w-2.5 h-2.5 bg-teal-400/40 rounded-full blur-[1px] animate-[pulse_6s_ease-in-out_infinite_1s]" />
            <span className="absolute bottom-1/4 right-1/2 w-1.5 h-1.5 bg-emerald-300/70 rounded-full blur-[0.5px] animate-[pulse_5s_ease-in-out_infinite_2s]" />
          </div>

          <span className="absolute right-8 sm:right-16 top-1/2 -translate-y-1/2 text-[16rem] sm:text-[22rem] lg:text-[28rem] font-black font-mono tracking-tighter text-emerald-400/[0.05] select-none pointer-events-none -z-10">
            02
          </span>

          <div
            style={{
              transform: `translateY(${Math.max(0, (1 - t1) * 30) - t2 * 40}px)`,
              opacity: Math.min(1, Math.max(0, (t1 - 0.2) * 2)) * Math.max(0, 1 - t2 * 2),
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="max-w-4xl space-y-6 z-10"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-emerald-400 uppercase">
              <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse" />
              <span>{SCENES[1].departmentTitle}</span>
            </div>

            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05]">
              {SCENES[1].name}
            </h2>

            <p className="text-lg sm:text-2xl text-emerald-100 font-normal leading-relaxed max-w-2xl">
              {SCENES[1].description}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-sm text-emerald-200/90 font-medium pt-2">
              {SCENES[1].badges.map((badge, idx) => (
                <React.Fragment key={badge}>
                  <span className="hover:text-white transition-colors">{badge}</span>
                  {idx < SCENES[1].badges.length - 1 && (
                    <span className="text-emerald-700 font-mono select-none">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-8">
              <a
                href="#locations"
                className="group/link inline-flex items-center gap-2.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>View location</span>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover/link:text-emerald-300 transition-transform duration-300 group-hover/link:translate-x-1.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            SCENE 2: TECH SHOP (DIAGONAL ANGULAR WIPE LAYER 2)
            ═════════════════════════════════════════════════════════════ */}
        <div
          style={{
            clipPath: `polygon(0 0, ${wipe2Top}% 0, ${wipe2Bottom}% 100%, 0 100%)`,
          }}
          className="absolute inset-0 w-full h-full flex flex-col justify-center px-6 sm:px-12 lg:px-24 z-20 overflow-hidden"
        >
          <div className="absolute inset-0 -z-20">
            <Image
              src={SCENES[2].imageSrc}
              alt={SCENES[2].imageAlt}
              fill
              sizes="100vw"
              style={{
                transform: `scale(${1 + t3 * 0.08})`,
                transition: "transform 0.4s ease-out",
              }}
              className="object-cover object-center"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${SCENES[2].overlayClass}`} />
            <div className="absolute inset-0 bg-[#04060a]/35" />
          </div>

          <div
            className="absolute top-0 right-0 w-96 h-96 opacity-30 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <svg
              className="w-full h-full text-cyan-400"
              viewBox="0 0 200 200"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M 10 100 L 75 100 L 115 140 L 190 140"
                strokeWidth="1.5"
                strokeDasharray="250"
                style={{
                  strokeDashoffset: t2 > 0.4 ? 0 : 250,
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
              <path
                d="M 30 40 L 95 40 L 135 80 L 190 80"
                strokeWidth="1.5"
                strokeDasharray="250"
                style={{
                  strokeDashoffset: t2 > 0.4 ? 0 : 250,
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
                }}
              />
              <circle cx="10" cy="100" r="3" fill="currentColor" />
              <circle cx="190" cy="140" r="3" fill="currentColor" />
              <circle cx="30" cy="40" r="3" fill="currentColor" />
              <circle cx="190" cy="80" r="3" fill="currentColor" />
            </svg>
          </div>

          <span className="absolute right-8 sm:right-16 top-1/2 -translate-y-1/2 text-[16rem] sm:text-[22rem] lg:text-[28rem] font-black font-mono tracking-tighter text-cyan-400/[0.05] select-none pointer-events-none -z-10">
            03
          </span>

          <div
            style={{
              transform: `translateY(${Math.max(0, (1 - t2) * 30) - t3 * 40}px)`,
              opacity: Math.min(1, Math.max(0, (t2 - 0.2) * 2)) * Math.max(0, 1 - t3 * 2),
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="max-w-4xl space-y-6 z-10"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 uppercase">
              <span className="w-1.5 h-1.5 bg-cyan-400 animate-pulse" />
              <span>{SCENES[2].departmentTitle}</span>
            </div>

            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05]">
              {SCENES[2].name}
            </h2>

            <p className="text-lg sm:text-2xl text-cyan-100 font-normal leading-relaxed max-w-2xl">
              {SCENES[2].description}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-sm text-cyan-200/90 font-medium pt-2">
              {SCENES[2].badges.map((badge, idx) => (
                <React.Fragment key={badge}>
                  <span className="hover:text-white transition-colors">{badge}</span>
                  {idx < SCENES[2].badges.length - 1 && (
                    <span className="text-cyan-700 font-mono select-none">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-8">
              <a
                href="#locations"
                className="group/link inline-flex items-center gap-2.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>View location</span>
                <ArrowRight className="w-4 h-4 text-cyan-400 group-hover/link:text-cyan-300 transition-transform duration-300 group-hover/link:translate-x-1.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            SCENE 3: SERVICES (DIAGONAL ANGULAR WIPE LAYER 3)
            ═════════════════════════════════════════════════════════════ */}
        <div
          style={{
            clipPath: `polygon(0 0, ${wipe3Top}% 0, ${wipe3Bottom}% 100%, 0 100%)`,
          }}
          className="absolute inset-0 w-full h-full flex flex-col justify-center px-6 sm:px-12 lg:px-24 z-30 overflow-hidden"
        >
          <div className="absolute inset-0 -z-20">
            <Image
              src={SCENES[3].imageSrc}
              alt={SCENES[3].imageAlt}
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${SCENES[3].overlayClass}`} />
            <div className="absolute inset-0 bg-[#04060a]/35" />
          </div>

          {/* Precision Workshop Pulse Grid */}
          <div
            className="absolute top-0 right-0 w-96 h-96 opacity-25 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <svg
              className="w-full h-full text-amber-400"
              viewBox="0 0 200 200"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M 20 160 L 60 160 L 80 120 L 100 180 L 120 140 L 140 160 L 180 160"
                strokeWidth="1.5"
                strokeDasharray="300"
                style={{
                  strokeDashoffset: t3 > 0.4 ? 0 : 300,
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
              <circle cx="20" cy="160" r="3" fill="currentColor" />
              <circle cx="180" cy="160" r="3" fill="currentColor" />
            </svg>
          </div>

          <span className="absolute right-8 sm:right-16 top-1/2 -translate-y-1/2 text-[16rem] sm:text-[22rem] lg:text-[28rem] font-black font-mono tracking-tighter text-amber-400/[0.05] select-none pointer-events-none -z-10">
            04
          </span>

          <div
            style={{
              transform: `translateY(${Math.max(0, (1 - t3) * 30)}px)`,
              opacity: Math.min(1, Math.max(0, (t3 - 0.2) * 2)),
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="max-w-4xl space-y-6 z-10"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-amber-400 uppercase">
              <span className="w-1.5 h-1.5 bg-amber-400 animate-pulse" />
              <span>{SCENES[3].departmentTitle}</span>
            </div>

            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05]">
              {SCENES[3].name}
            </h2>

            <p className="text-lg sm:text-2xl text-amber-100 font-normal leading-relaxed max-w-2xl">
              {SCENES[3].description}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-sm text-amber-200/90 font-medium pt-2">
              {SCENES[3].badges.map((badge, idx) => (
                <React.Fragment key={badge}>
                  <span className="hover:text-white transition-colors">{badge}</span>
                  {idx < SCENES[3].badges.length - 1 && (
                    <span className="text-amber-700 font-mono select-none">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-8">
              <a
                href="#locations"
                className="group/link inline-flex items-center gap-2.5 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>View location</span>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover/link:text-amber-300 transition-transform duration-300 group-hover/link:translate-x-1.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ── PERSISTENT SCENE PROGRESS INDICATOR (FIXED ON EDGE) ── */}
        <div className="absolute right-6 sm:right-10 bottom-12 z-40 flex flex-col items-end gap-3 pointer-events-auto">
          <div className="flex items-center gap-3 font-mono text-xs">
            {SCENES.map((scene, idx) => (
              <span
                key={scene.id}
                className={`transition-all duration-500 font-bold ${
                  activeSceneIndex === idx ? "text-white scale-110" : "text-zinc-600"
                }`}
              >
                {scene.number}
              </span>
            ))}
          </div>

          {/* Thin progress track */}
          <div className="relative w-44 h-[2px] bg-zinc-800 rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, Math.max(4, scrollProgress * 100))}%`,
              }}
              className="h-full bg-gradient-to-r from-slate-400 via-emerald-400 via-cyan-400 to-amber-400 transition-all duration-150"
            />
          </div>

          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">
            {SCENES[activeSceneIndex].name}
          </span>
        </div>
      </div>
    </section>
  );
}
