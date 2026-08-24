"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
  threshold = 0.15,
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (elementRef.current) {
              observer.unobserve(elementRef.current);
            }
          }
        });
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    const currentEl = elementRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [threshold]);

  const getDirectionTransform = () => {
    if (isVisible) return "translate-x-0 translate-y-0 opacity-100";
    switch (direction) {
      case "up":
        return "translate-y-8 opacity-0";
      case "down":
        return "-translate-y-8 opacity-0";
      case "left":
        return "translate-x-8 opacity-0";
      case "right":
        return "-translate-x-8 opacity-0";
      case "none":
        return "opacity-0";
    }
  };

  return (
    <div
      ref={elementRef}
      style={{
        transitionDuration: "850ms",
        transitionDelay: `${delayMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`transform transition-all ${getDirectionTransform()} ${className}`}
    >
      {children}
    </div>
  );
}

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  durationMs = 1400,
  className = "",
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setCount(value);
      setHasTriggered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            setHasTriggered(true);
            let startTime: number | null = null;

            const step = (timestamp: number) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / durationMs, 1);
              // Ease out quart: 1 - (1 - progress)^4
              const easeOut = 1 - Math.pow(1 - progress, 4);
              setCount(Math.floor(easeOut * value));

              if (progress < 1) {
                window.requestAnimationFrame(step);
              } else {
                setCount(value);
              }
            };

            window.requestAnimationFrame(step);
            if (counterRef.current) {
              observer.unobserve(counterRef.current);
            }
          }
        });
      },
      { threshold: 0.1 },
    );

    const currentEl = counterRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [value, durationMs, hasTriggered]);

  return (
    <span ref={counterRef} className={className}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}
