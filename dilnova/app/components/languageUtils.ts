// Shared language configuration and cookie utilities
// Used by LanguageSplash, FloatingLanguageButton, and LanguageSelector

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  greeting: string;
  subtitle: string;
}

export const LANG_PREFERENCE_STORAGE_KEY = 'dilnova_lang';

export const LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    greeting: 'Welcome',
    subtitle: 'Continue in English',
  },
  {
    code: 'si',
    name: 'Sinhala',
    nativeName: 'සිංහල',
    flag: '🇱🇰',
    greeting: 'සාදරයෙන් පිළිගනිමු',
    subtitle: 'සිංහලෙන් ඉදිරියට යන්න',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇱🇰',
    greeting: 'வரவேற்கிறோம்',
    subtitle: 'தமிழில் தொடரவும்',
  },
];

/** Read a cookie by name */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function readLangPreferenceFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LANG_PREFERENCE_STORAGE_KEY)?.trim();
    if (stored && LANGUAGES.some((lang) => lang.code === stored)) {
      return stored;
    }
  } catch {
    // localStorage may be blocked in private mode
  }
  return null;
}

function writeLangPreferenceToStorage(lang: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_PREFERENCE_STORAGE_KEY, lang);
  } catch {
    // Ignore quota / privacy errors
  }
}

/** Set the googtrans cookie across all relevant domain scopes */
export function setGoogTransCookie(lang: string): void {
  const host = window.location.hostname;

  // Collect all domain variants to clear old cookies
  const domains = ['', `; domain=${host}`, `; domain=.${host}`];
  if (!host.includes('localhost') && host.includes('.')) {
    const parts = host.split('.');
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join('.');
      domains.push(`; domain=.${rootDomain}`);
      domains.push(`; domain=${rootDomain}`);
    }
  }

  // Delete all existing googtrans cookies
  domains.forEach((d) => {
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${d}`;
  });

  if (lang === 'en') {
    return;
  }

  // Write new googtrans cookie
  document.cookie = `googtrans=/en/${lang}; path=/`;
  document.cookie = `googtrans=/en/${lang}; path=/; domain=${host}`;
  if (!host.includes('localhost') && host.includes('.')) {
    const parts = host.split('.');
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join('.');
      document.cookie = `googtrans=/en/${lang}; path=/; domain=.${rootDomain}`;
    }
  }
}

/** Set the lang_preference cookie (persists user's explicit choice) */
export function setLangPreferenceCookie(lang: string): void {
  // Persist for 1 year
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `lang_preference=${lang}; path=/; expires=${expires}; SameSite=Lax`;
  writeLangPreferenceToStorage(lang);
}

/** Get the persisted language preference */
export function getLangPreference(): string | null {
  const fromCookie = getCookie('lang_preference');
  if (fromCookie && LANGUAGES.some((lang) => lang.code === fromCookie)) {
    return fromCookie;
  }

  return readLangPreferenceFromStorage();
}

/** Get current language from googtrans cookie */
export function getCurrentLangFromCookie(): string {
  const cookieVal = getCookie('googtrans');
  if (cookieVal) {
    const parts = cookieVal.split('/');
    const code = parts[parts.length - 1];
    if (LANGUAGES.some((l) => l.code === code)) {
      return code;
    }
  }
  return 'en';
}

/** Detect best language from browser locale */
export function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('si')) return 'si';
  if (browserLang.startsWith('ta')) return 'ta';
  return 'en';
}

export function hasLanguageChoice(): boolean {
  if (getLangPreference()) return true;
  if (readLangPreferenceFromStorage()) return true;

  const googtrans = getCookie('googtrans');
  if (googtrans) {
    const code = googtrans.split('/').pop();
    if (code && LANGUAGES.some((lang) => lang.code === code)) {
      return true;
    }
  }

  return false;
}

/** First visit: persist browser language without blocking the page or reloading. */
export function initDefaultLanguageIfNeeded(): string | null {
  if (hasLanguageChoice()) return getLangPreference() || readLangPreferenceFromStorage();

  const detected = detectBrowserLanguage();
  setGoogTransCookie(detected);
  setLangPreferenceCookie(detected);
  return detected;
}

/** Apply a language change: set cookies and optionally reload */
export function applyLanguage(langCode: string, reload = true): void {
  setGoogTransCookie(langCode);
  setLangPreferenceCookie(langCode);
  if (reload) {
    window.location.reload();
  }
}
