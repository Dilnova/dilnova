"use client";

import { useState, useEffect, useRef } from "react";

export default function SmartHeader({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show near top
      if (currentScrollY <= 64) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current + 8) {
        // Scrolling down past threshold -> hide header
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - 8) {
        // Scrolling up past threshold -> reveal header
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 flex justify-between items-center px-3 sm:px-4 md:px-6 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md min-h-[3.5rem] sm:min-h-[4rem] max-w-full transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {children}
    </header>
  );
}
