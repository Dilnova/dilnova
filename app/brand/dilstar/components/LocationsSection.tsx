"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "./MotionWrapper";
import { MapPin, Phone, Clock, ExternalLink, ArrowRight } from "lucide-react";
import { DILSTAR_MEDIA } from "../data/media";

export function LocationsSection() {
  const shops = [
    {
      id: "hardware-location",
      name: "Dilstar Hardware",
      tag: "Building & Tools",
      thumb: DILSTAR_MEDIA.locations.hardwareThumb,
      address: "Dilstar, Ambalantota, Sri Lanka",
      phone: "Phone number to be added",
      hours: "Opening hours to be added",
      storefrontHref: "/vendors/dilstar-hardware",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Dilstar+Hardware+Ambalantota+Sri+Lanka",
    },
    {
      id: "nursery-location",
      name: "Dilstar Nursery",
      tag: "Coconut & Garden",
      thumb: DILSTAR_MEDIA.locations.nurseryThumb,
      address: "Dilstar, Ambalantota, Sri Lanka",
      phone: "Phone number to be added",
      hours: "Opening hours to be added",
      storefrontHref: "/vendors/dilstar-nursery",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Dilstar+Nursery+Ambalantota+Sri+Lanka",
    },
    {
      id: "tech-location",
      name: "Dilstar Tech Shop",
      tag: "Phones & Electronics",
      thumb: DILSTAR_MEDIA.locations.techThumb,
      address: "Dilstar, Ambalantota, Sri Lanka",
      phone: "Phone number to be added",
      hours: "Opening hours to be added",
      storefrontHref: "/vendors/dilstar-tech",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Dilstar+Tech+Shop+Ambalantota+Sri+Lanka",
    },
    {
      id: "services-location",
      name: "Dilstar Services",
      tag: "Technical & Advisory",
      thumb: DILSTAR_MEDIA.locations.servicesThumb,
      address: "Dilstar, Ambalantota, Sri Lanka",
      phone: "Phone number to be added",
      hours: "Opening hours to be added",
      storefrontHref: "/vendors/dilstar-services",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Dilstar+Services+Ambalantota+Sri+Lanka",
    },
  ];

  return (
    <section
      id="locations"
      className="relative py-28 sm:py-36 px-6 sm:px-12 lg:px-24 bg-[#04060a] border-t border-zinc-900"
    >
      <div className="max-w-6xl mx-auto">
        <ScrollReveal direction="up" className="max-w-2xl mb-16 sm:mb-20">
          <span className="text-xs font-mono tracking-widest uppercase text-teal-400">
            Visit Us
          </span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-black text-white tracking-tight">
            Our Locations in Ambalantota.
          </h2>
          <p className="mt-4 text-base text-zinc-400 font-normal leading-relaxed">
            Conveniently located in Ambalantota, Sri Lanka. Stop by any of our four shops or get
            direct navigation below.
          </p>
        </ScrollReveal>

        {/* Four simple list-style blocks separated by thin dividing lines (not heavy cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8 lg:gap-10 divide-y sm:divide-y-0 divide-zinc-900">
          {shops.map((shop, idx) => (
            <ScrollReveal
              key={shop.name}
              delayMs={idx * 120}
              direction="up"
              className={`flex flex-col justify-between space-y-6 ${
                idx > 0 ? "pt-10 sm:pt-0" : ""
              }`}
            >
              <div className="space-y-5">
                {/* Small Storefront Thumbnail */}
                {/* [PLACEHOLDER: replace with real storefront photo in DILSTAR_MEDIA.locations] */}
                <Link
                  href={shop.storefrontHref}
                  className="group relative h-40 w-full overflow-hidden bg-zinc-950 rounded-lg border border-zinc-800 block focus:outline-none"
                >
                  <Image
                    src={shop.thumb.src}
                    alt={shop.thumb.alt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04060a]/90 via-transparent to-transparent pointer-events-none" />
                </Link>

                {/* Shop Title & Tag */}
                <div>
                  <span className="text-[11px] font-mono tracking-wider text-teal-400 uppercase block">
                    {shop.tag}
                  </span>
                  <Link href={shop.storefrontHref} className="group/title block focus:outline-none">
                    <h3 className="text-xl font-bold text-white tracking-tight mt-1 group-hover/title:text-teal-300 transition-colors">
                      {shop.name}
                    </h3>
                  </Link>
                </div>

                {/* Details */}
                <div className="space-y-3 text-xs text-zinc-400 pt-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-zinc-300 font-semibold block">Address</span>
                      <span>{shop.address}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-zinc-300 font-semibold block">Phone</span>
                      <span className="font-mono text-zinc-500">{shop.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-zinc-300 font-semibold block">Opening Hours</span>
                      <span className="font-mono text-zinc-500">{shop.hours}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions: Storefront & Directions */}
              <div className="pt-4 flex flex-col gap-2.5">
                <Link
                  href={shop.storefrontHref}
                  className="group inline-flex items-center justify-between px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all font-mono"
                >
                  <span>Visit Storefront</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href={shop.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-teal-300 transition-colors uppercase tracking-wider font-mono px-1"
                >
                  <span>Get directions</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-teal-300 transition-colors" />
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
