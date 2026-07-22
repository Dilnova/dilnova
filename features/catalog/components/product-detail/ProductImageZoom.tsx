"use client";

import { useState, useRef, MouseEvent } from "react";
import Image from "next/image";

interface ProductImageZoomProps {
  imageUrl: string;
  alt: string;
}

export default function ProductImageZoom({ imageUrl, alt }: ProductImageZoomProps) {
  const [zoomStyle, setZoomStyle] = useState({
    transformOrigin: "center center",
    transform: "scale(1)",
  });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: "scale(2.2)",
    });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: "center center",
      transform: "scale(1)",
    });
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner cursor-zoom-in group select-none"
    >
      {/* 1. Blurred Backdrop (Fills container, provides matching ambient background color) */}
      <div className="absolute inset-0 w-full h-full scale-110 blur-2xl opacity-40 dark:opacity-20 pointer-events-none select-none">
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="100px" priority />
      </div>

      {/* 2. Sharp Uncropped Zoomable Foreground Image */}
      <div className="w-full h-full transition-transform duration-100 ease-out" style={zoomStyle}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain p-4 transition-all duration-300"
          sizes="(max-width: 1024px) 100vw, 40vw"
          priority
        />
      </div>

      {/* Premium Visual Indicator */}
      <div
        className={`absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-mono tracking-wider flex items-center gap-1.5 transition-all duration-300 pointer-events-none select-none border border-white/10 ${
          isHovered ? "opacity-0 scale-95" : "opacity-100 scale-100 shadow-sm"
        }`}
      >
        <svg
          className="w-3.5 h-3.5 text-zinc-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
          />
        </svg>
        <span>HOVER TO ZOOM</span>
      </div>
    </div>
  );
}
