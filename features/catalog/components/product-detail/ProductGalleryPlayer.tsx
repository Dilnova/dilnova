"use client";

import { useState } from "react";
import Image from "next/image";
import ProductImageZoom from "./ProductImageZoom";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

interface ProductGalleryPlayerProps {
  media: MediaItem[];
  alt: string;
  type: string;
}

export default function ProductGalleryPlayer({ media, alt, type }: ProductGalleryPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!media || media.length === 0) {
    return (
      <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center text-6xl select-none">
        📦
      </div>
    );
  }

  const activeItem = media[activeIndex];

  return (
    <div className="space-y-4">
      {/* 1. Main Display Area */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-zinc-100 dark:bg-zinc-900">
        {activeItem.type === "video" ? (
          <div className="w-full h-full bg-black flex items-center justify-center relative">
            <video
              src={activeItem.url}
              controls
              className="w-full h-full object-contain"
              autoPlay={false}
              playsInline
            />
            {/* Elegant Video Badge */}
            <span className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-mono tracking-wider px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 pointer-events-none select-none">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>VIDEO PLAYER</span>
            </span>
          </div>
        ) : (
          <ProductImageZoom imageUrl={activeItem.url} alt={alt} />
        )}

        {/* Type Badge */}
        <span
          className={`absolute top-4 right-4 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md z-10 ${
            type === "service" ? "bg-emerald-500 text-emerald-950" : "bg-indigo-500 text-indigo-50"
          }`}
        >
          {type}
        </span>
      </div>

      {/* 2. Horizontal Thumbnails Carousel / Selector (only if more than 1 item) */}
      {media.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {media.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border bg-zinc-100 dark:bg-zinc-900 transition-all duration-200 cursor-pointer outline-none ${
                  isActive
                    ? "ring-2 ring-purple-600 dark:ring-purple-400 border-transparent scale-95 shadow-md"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:scale-105"
                }`}
              >
                {item.type === "video" ? (
                  <div className="relative w-full h-full bg-zinc-950 flex items-center justify-center">
                    {/* Preload first frames if supported or fallback to a play overlay */}
                    <video
                      src={item.url}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center transition-colors hover:bg-black/10">
                      <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                        <svg
                          className="w-3.5 h-3.5 text-white fill-white ml-0.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-[8px] text-zinc-300 px-1 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
                      VIDEO
                    </span>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={item.url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
