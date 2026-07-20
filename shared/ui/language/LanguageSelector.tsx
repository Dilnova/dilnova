'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LANGUAGES,
  getCurrentLangFromCookie,
  getLangPreference,
  setLangPreferenceCookie,
  setGoogTransCookie,
  applyLanguage,
} from './languageUtils';

export default function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState('en');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Define global init function immediately so it is always present
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,si,ta',
        layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
    };

    // 2. Check existing preference or cookie
    const pref = getLangPreference();
    const lang = pref || getCurrentLangFromCookie();

    // If we have a preference but no googtrans, re-apply it
    if (pref && !getCurrentLangFromCookie()) {
      setGoogTransCookie(pref);
    }

    // If no preference cookie exists but we have googtrans, sync it
    if (!pref && lang !== 'en') {
      setLangPreferenceCookie(lang);
    }

    requestAnimationFrame(() => {
      setCurrentLang(lang);
    });

    // 3. Inject Google Translate script dynamically if not already present and not a bot
    const isBot = typeof navigator !== 'undefined' && /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent || '');
    if (!isBot && !document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else if (!isBot) {
      // If script is already loaded but we remounted, re-run init if google API exists
      if ((window as any).google && (window as any).google.translate) {
        try {
          (window as any).googleTranslateElementInit();
        } catch (e) {
          console.warn('Google Translate re-init deferred:', { error: e });
        }
      }
    }

    // 4. Click outside handler to close dropdown
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, []);

  const handleLanguageChange = (langCode: string) => {
    if (langCode === currentLang) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    applyLanguage(langCode, true);
  };

  const activeLang = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Off-screen container required by Google Translate script (hidden with opacity/pointer-events instead of display: none to avoid offsetParent initialization failures) */}
      <div id="google_translate_element" className="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden" />

      {/* Styled Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200/60 dark:border-zinc-800 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        aria-label="Select Language"
      >
        <span className="text-sm leading-none">{activeLang.flag}</span>
        <span>{activeLang.nativeName}</span>
        <svg
          className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg shadow-xl py-1.5 z-[9999] transition-all animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Language / භාෂාව / மொழி
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{lang.flag}</span>
                <span className="flex flex-col">
                  <span className="font-semibold">{lang.nativeName}</span>
                  {lang.code !== 'en' && (
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 leading-none">{lang.name}</span>
                  )}
                </span>
              </div>
              {currentLang === lang.code && (
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
