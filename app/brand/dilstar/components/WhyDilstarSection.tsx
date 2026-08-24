"use client";

import React from "react";
import { ScrollReveal } from "./MotionWrapper";
import { Users, ShieldCheck, MapPin, Smile } from "lucide-react";

export function WhyDilstarSection() {
  const pillars = [
    {
      icon: Users,
      title: "Locally owned",
      shortLine: "Proudly independent and rooted in Ambalantota's local community.",
    },
    {
      icon: ShieldCheck,
      title: "One trusted name",
      shortLine: "The same standard of honesty across all three stores.",
    },
    {
      icon: MapPin,
      title: "One easy location",
      shortLine: "Building tools, plants, and mobile tech in one trip.",
    },
    {
      icon: Smile,
      title: "Honest, friendly service",
      shortLine: "Straightforward guidance and fair local pricing every visit.",
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#05070d]/60 border-t border-zinc-900/80">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal direction="up" className="text-center max-w-xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-semibold tracking-wider uppercase text-teal-400">
            The Dilstar Standard
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Why Ambalantota trusts Dilstar
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <ScrollReveal
                key={pillar.title}
                delayMs={idx * 100}
                direction="up"
                className="group relative flex flex-col p-6 sm:p-7 rounded-2xl bg-zinc-900/35 border border-zinc-800/60 hover:border-zinc-700/80 hover:bg-zinc-900/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-teal-400 group-hover:text-teal-300 group-hover:scale-105 transition-all duration-300 mb-5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-2">
                  {pillar.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  {pillar.shortLine}
                </p>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
