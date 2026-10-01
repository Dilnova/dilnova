import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
  OPEN_COOKIE_PREFERENCES_EVENT,
  parseCookieConsent,
  hasAnalyticsConsent,
  getClientCookieConsent,
  setClientCookieConsent,
  openCookiePreferences,
} from "@/shared/cookies/consent";

describe("Cookie Consent Utilities (GDPR & ePrivacy Compliance - Finding 20.2)", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  describe("parseCookieConsent", () => {
    it("returns null for empty, undefined, or null input", () => {
      expect(parseCookieConsent(null)).toBeNull();
      expect(parseCookieConsent(undefined)).toBeNull();
      expect(parseCookieConsent("")).toBeNull();
    });

    it("returns null when the consent cookie is not present", () => {
      expect(parseCookieConsent("session_id=123; user_theme=dark")).toBeNull();
    });

    it("parses accepted consent from single cookie string", () => {
      expect(parseCookieConsent(`${COOKIE_CONSENT_KEY}=accepted`)).toBe("accepted");
    });

    it("parses declined consent from single cookie string", () => {
      expect(parseCookieConsent(`${COOKIE_CONSENT_KEY}=declined`)).toBe("declined");
    });

    it("parses consent amidst multiple cookies with various spacing", () => {
      const cookieHeader = `theme=dark; ${COOKIE_CONSENT_KEY}=accepted; _ga=12345; auth_token=abc`;
      expect(parseCookieConsent(cookieHeader)).toBe("accepted");

      const cookieHeader2 = `a=1;${COOKIE_CONSENT_KEY}=declined;b=2`;
      expect(parseCookieConsent(cookieHeader2)).toBe("declined");
    });

    it("rejects unknown or invalid consent values", () => {
      expect(parseCookieConsent(`${COOKIE_CONSENT_KEY}=partial`)).toBeNull();
      expect(parseCookieConsent(`${COOKIE_CONSENT_KEY}=true`)).toBeNull();
      expect(parseCookieConsent(`${COOKIE_CONSENT_KEY}=1`)).toBeNull();
      expect(parseCookieConsent(`${COOKIE_CONSENT_KEY}=malicious_script`)).toBeNull();
    });
  });

  describe("hasAnalyticsConsent", () => {
    it("returns true only when status is strictly 'accepted'", () => {
      expect(hasAnalyticsConsent("accepted")).toBe(true);
    });

    it("returns false for declined, null, undefined, or arbitrary strings", () => {
      expect(hasAnalyticsConsent("declined")).toBe(false);
      expect(hasAnalyticsConsent(null)).toBe(false);
      expect(hasAnalyticsConsent(undefined)).toBe(false);
      expect(hasAnalyticsConsent("")).toBe(false);
      expect(hasAnalyticsConsent("accepted_all")).toBe(false);
    });
  });

  describe("client-side cookie helpers", () => {
    let mockCookieStore: string;
    let mockDispatchEvent: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockCookieStore = "";
      mockDispatchEvent = vi.fn();

      // Mock DOM environment for Node runtime test runner
      globalThis.document = {
        get cookie() {
          return mockCookieStore;
        },
        set cookie(val: string) {
          mockCookieStore = val;
        },
      } as unknown as Document;

      globalThis.window = {
        dispatchEvent: mockDispatchEvent,
      } as unknown as Window & typeof globalThis;
    });

    it("getClientCookieConsent returns null when document cookie is empty", () => {
      mockCookieStore = "";
      expect(getClientCookieConsent()).toBeNull();
    });

    it("getClientCookieConsent parses status from document.cookie", () => {
      mockCookieStore = `${COOKIE_CONSENT_KEY}=accepted; other=1`;
      expect(getClientCookieConsent()).toBe("accepted");

      mockCookieStore = `${COOKIE_CONSENT_KEY}=declined`;
      expect(getClientCookieConsent()).toBe("declined");
    });

    it("setClientCookieConsent stores cookie with security attributes and dispatches event", () => {
      setClientCookieConsent("accepted");

      expect(mockCookieStore).toContain(`${COOKIE_CONSENT_KEY}=accepted`);
      expect(mockCookieStore).toContain("path=/");
      expect(mockCookieStore).toContain("max-age=31536000");
      expect(mockCookieStore).toContain("samesite=lax");

      expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = mockDispatchEvent.mock.calls[0][0] as Event;
      expect(dispatchedEvent.type).toBe(COOKIE_CONSENT_EVENT);
    });

    it("setClientCookieConsent dispatches event when declining", () => {
      setClientCookieConsent("declined");

      expect(mockCookieStore).toContain(`${COOKIE_CONSENT_KEY}=declined`);
      expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = mockDispatchEvent.mock.calls[0][0] as Event;
      expect(dispatchedEvent.type).toBe(COOKIE_CONSENT_EVENT);
    });

    it("openCookiePreferences dispatches OPEN_COOKIE_PREFERENCES_EVENT on window", () => {
      openCookiePreferences();

      expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = mockDispatchEvent.mock.calls[0][0] as Event;
      expect(dispatchedEvent.type).toBe(OPEN_COOKIE_PREFERENCES_EVENT);
    });
  });
});
