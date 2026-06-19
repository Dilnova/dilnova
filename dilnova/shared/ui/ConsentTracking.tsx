'use client';

import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function ConsentTracking() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConsent = () => {
      const stored = localStorage.getItem('dilnova_cookie_consent');
      setConsent(stored === 'accepted');
    };

    // Check initial consent state on mount
    checkConsent();

    // Listen for consent preference changes
    window.addEventListener('cookie-consent-changed', checkConsent);
    return () => {
      window.removeEventListener('cookie-consent-changed', checkConsent);
    };
  }, []);

  if (consent !== true) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
