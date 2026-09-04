"use client";

import React from "react";
import { ScrollReveal } from "./MotionWrapper";

export function WhyDilstarSection() {
  const pillars = [
    {
      number: "01",
      title: "Locally owned",
      shortLine: "Proudly independent and rooted in Ambalantota's local community.",
    },
    {
      number: "02",
      title: "One trusted name",
      shortLine: "The same standard of honesty across all four stores.",
    },
    {
      number: "03",
      title: "One easy location",
      shortLine: "Building tools, plants, mobile tech, and services in one trip.",
    },
    {
      number: "04",
      title: "Honest, friendly service",
      shortLine: "Straightforward guidance and fair local pricing every visit.",
    },
  ];

  return (
    <section className="relative py-28 sm:py-40 px-6 sm:px-12 lg:px-24 bg-[#04060a]">
      <div className="max-w-6xl mx-auto">
        {/* Section Header with generous whitespace */}
        <ScrollReveal direction="up" className="max-w-2xl mb-20 sm:mb-28">
          <span className="text-xs font-mono tracking-widest uppercase text-teal-400">
            The Dilstar Standard
          </span>
          <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Why Ambalantota trusts Dilstar.
          </h2>
        </ScrollReveal>

        {/* 4 Minimal Text Blocks (NO cards, NO borders, NO containers) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-14 lg:gap-16">
          {pillars.map((pillar, idx) => (
            <ScrollReveal
              key={pillar.title}
              delayMs={idx * 100}
              direction="up"
              className="space-y-4"
            >
              <span className="text-xs font-mono tracking-widest text-zinc-600 font-bold block">
                {pillar.number}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {pillar.title}
              </h3>
              <p className="text-sm text-zinc-400 font-normal leading-relaxed">
                {pillar.shortLine}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
