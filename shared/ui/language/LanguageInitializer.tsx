"use client";

import { useEffect } from "react";
import { hasLanguageChoice, initDefaultLanguageIfNeeded } from "./languageUtils";

/** Silently persist a default language before the splash can block the page. */
export default function LanguageInitializer() {
  useEffect(() => {
    if (hasLanguageChoice()) return;
    initDefaultLanguageIfNeeded();
  }, []);

  return null;
}
