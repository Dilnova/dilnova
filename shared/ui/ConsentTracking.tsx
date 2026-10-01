"use client";

import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  COOKIE_CONSENT_EVENT,
  getClientCookieConsent,
  hasAnalyticsConsent,
} from "@/shared/cookies/consent";

export default function ConsentTracking({ initialConsent }: { initialConsent?: boolean }) {
  const [consent, setConsent] = useState<boolean>(!!initialConsent);

  useEffect(() => {
    const updateConsent = () => {
      const current = getClientCookieConsent();
      setConsent(hasAnalyticsConsent(current));
    };

    // Synchronize on client mount in case cookie state changed since SSR
    updateConsent();

    window.addEventListener(COOKIE_CONSENT_EVENT, updateConsent);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, updateConsent);
    };
  }, []);

  if (!consent) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
