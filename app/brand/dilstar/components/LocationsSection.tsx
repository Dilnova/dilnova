"use client";

import React from "react";
import Image from "next/image";
import { ScrollReveal } from "./MotionWrapper";
import { MapPin, Phone, Clock, ExternalLink, Wrench, Sprout, Smartphone } from "lucide-react";
import { DILSTAR_MEDIA } from "../data/media";

export function LocationsSection() {
  const shops = [
    {
      id: "hardware-location",
      name: "Dilstar Hardware",
      tag: "Building & Tools",
      icon: Wrench,
      accentBorder: "border-slate-700/80",
      accentText: "text-slate-300",
      thumb: DILSTAR_MEDIA.locations.hardwareThumb,
      address: "Dilstar, Ambalantota, Sri Lanka",
      phone: "Phone number to be added",
      hours: "Opening hours to be added",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Dilstar+Hardware+Ambalantota+Sri+Lanka",
    },
    {
      id: "nursery-location",
      name: "Dilstar Nursery",
      tag: "Coconut & Garden",
      icon: Sprout,
      accentBorder: "border-emerald-800/80",
      accentText: "text-emerald-400",
      thumb: DILSTAR_MEDIA.locations.nurseryThumb,
      address: "Dilstar, Ambalantota, Sri Lanka",
      phone: "Phone number to be added",
      hours: "Opening hours to be added",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Dilstar+Nursery+Ambalantota+Sri+Lanka",
    },
    {
      id: "tech-location",
      name: "Dilstar Tech Shop",
      tag: "Phones & Electronics",
      icon: Smartphone,
      accentBorder: "border-cyan-800/80",
      accentText: "text-cyan-400",
      thumb: DILSTAR_MEDIA.locations.techThumb,
      address: "Dilstar, Ambalantota, Sri Lanka",
      phone: "Phone number to be added",
      hours: "Opening hours to be added",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Dilstar+Tech+Shop+Ambalantota+Sri+Lanka",
    },
  ];

  return (
    <section
      id="locations"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#04060a] border-t border-zinc-900"
    >
      <div className="max-w-6xl mx-auto">
        <ScrollReveal direction="up" className="text-center max-w-xl mx-auto mb-14 sm:mb-18">
          <span className="text-xs font-semibold tracking-wider uppercase text-teal-400">
            Visit Us
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Our Locations in Ambalantota
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Conveniently situated in Ambalantota, Sri Lanka. Stop by any of our shops or get
            directions below.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {shops.map((shop, idx) => {
            const Icon = shop.icon;
            return (
              <ScrollReveal
                key={shop.name}
                delayMs={idx * 150}
                direction="up"
                className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-zinc-900/40 border border-zinc-800/90 hover:border-zinc-700 transition-all duration-300 shadow-lg hover:-translate-y-1 backdrop-blur-sm group"
              >
                <div className="space-y-5">
                  {/* Small Storefront Thumbnail */}
                  {/* [PLACEHOLDER: replace with real storefront photo in DILSTAR_MEDIA.locations] */}
                  <div className="relative h-36 w-full rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950">
                    <Image
                      src={shop.thumb.src}
                      alt={shop.thumb.alt}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                  </div>

                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg bg-zinc-950 border ${shop.accentBorder} ${shop.accentText}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {shop.name}
                        </h3>
                        <span className="text-[11px] font-medium text-zinc-400">{shop.tag}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-zinc-800/80" />

                  {/* Practical Details (Address, Phone Placeholder, Hours Placeholder) */}
                  <div className="space-y-3.5 text-xs">
                    {/* Address */}
                    <div className="flex items-start gap-3 text-zinc-300">
                      <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-zinc-200 block">Address</span>
                        <span className="text-zinc-400">{shop.address}</span>
                      </div>
                    </div>

                    {/* Phone Placeholder */}
                    <div className="flex items-start gap-3 text-zinc-300">
                      <Phone className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-zinc-200 block">Phone</span>
                        <span className="text-zinc-400 font-mono text-[11px]">{shop.phone}</span>
                      </div>
                    </div>

                    {/* Hours Placeholder */}
                    <div className="flex items-start gap-3 text-zinc-300">
                      <Clock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-zinc-200 block">Opening Hours</span>
                        <span className="text-zinc-400 font-mono text-[11px]">{shop.hours}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Get Directions CTA */}
                <div className="pt-6">
                  <a
                    href={shop.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold tracking-wide transition-colors group/btn"
                  >
                    <span>Get directions</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover/btn:text-white transition-colors" />
                  </a>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
