export const COOKIE_CONSENT_KEY = "dilnova_cookie_consent";
export const COOKIE_CONSENT_EVENT = "cookie-consent-changed";
export const OPEN_COOKIE_PREFERENCES_EVENT = "open-cookie-preferences";

export type CookieConsentStatus = "accepted" | "declined";

/**
 * Parses the consent value from a document.cookie string or Cookie header string.
 */
export function parseCookieConsent(cookieString?: string | null): CookieConsentStatus | null {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp(`(?:^|;\\s*)${COOKIE_CONSENT_KEY}=([^;]+)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1].trim());
  if (value === "accepted" || value === "declined") {
    return value;
  }
  return null;
}

/**
 * Checks whether analytics/performance tracking has been explicitly consented to.
 * Returns false by default if consent is missing or declined (strict GDPR compliance).
 */
export function hasAnalyticsConsent(status?: string | null): boolean {
  return status === "accepted";
}

/**
 * Client-side helper to read the current consent status from document.cookie.
 */
export function getClientCookieConsent(): CookieConsentStatus | null {
  if (typeof document === "undefined") return null;
  return parseCookieConsent(document.cookie);
}

/**
 * Client-side helper to persist consent status and dispatch change event.
 */
export function setClientCookieConsent(status: CookieConsentStatus): void {
  if (typeof document === "undefined") return;
  const secure = process.env.NODE_ENV === "production" ? "; secure" : "";
  // 1 year retention (standard GDPR/ePrivacy window)
  document.cookie = `${COOKIE_CONSENT_KEY}=${status}; path=/; max-age=31536000; samesite=lax${secure}`;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  }
}

/**
 * Client-side helper to trigger opening the cookie preferences banner from anywhere.
 */
export function openCookiePreferences(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
  }
}
