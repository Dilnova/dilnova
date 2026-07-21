'use client';

import { useEffect, useRef } from 'react';

interface SafeProgressBarProps {
  percent: number;
  className?: string;
}

/**
 * Enterprise-grade progress bar component that applies the width dynamically via the CSS Object Model (CSSOM).
 * This completely avoids emitting 'style="width: X%"' into the HTML during SSR, which satisfies strict Content Security Policies (CSP) without requiring 'unsafe-inline'.
 */
export default function SafeProgressBar({ percent, className = '' }: SafeProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }
  }, [percent]);

  return <div ref={ref} className={className} />;
}
