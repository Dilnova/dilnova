"use client";

import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function ConsentTracking({ initialConsent }: { initialConsent?: boolean }) {
  const [consent, setConsent] = useState<boolean>(!!initialConsent);

  useEffect(() => {
    const checkConsent = () => {
      const match = document.cookie.match(new RegExp("(^| )dilnova_cookie_consent=([^;]+)"));
      setConsent(match ? match[2] === "accepted" : false);
    };

    // Check initial consent state on mount
    checkConsent();

    // Listen for consent preference changes
    window.addEventListener("cookie-consent-changed", checkConsent);
    return () => {
      window.removeEventListener("cookie-consent-changed", checkConsent);
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
