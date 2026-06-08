'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LANGUAGES,
  getCurrentLangFromCookie,
  getLangPreference,
  applyLanguage,
} from './languageUtils';

export default function FloatingLanguageButton() {
  const [currentLang, setCurrentLang] = useState('en');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasPreference, setHasPreference] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read current language from cookie
    const pref = getLangPreference() || getCurrentLangFromCookie();
    const hasPref = !!getLangPreference();
    requestAnimationFrame(() => {
      setCurrentLang(pref);
      setHasPreference(hasPref);
    });

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (langCode: string) => {
    if (langCode === currentLang) {
      setIsExpanded(false);
      return;
    }
    setIsExpanded(false);
    applyLanguage(langCode, true);
  };

  const activeLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  if (!hasPreference) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end gap-2"
    >
      {/* Expanded language list */}
      {isExpanded && (
        <div className="floating-lang-menu bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/40 p-2 min-w-[180px] overflow-hidden">
          <div className="px-3 py-1.5 text-[9px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800/60 mb-1">
            🌐 Language / භාෂාව / மொழி
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all duration-200 cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="flex flex-col">
                  <span className="font-semibold">{lang.nativeName}</span>
                  {lang.code !== 'en' && (
                    <span className="text-[9px] text-zinc-500 leading-tight">{lang.name}</span>
                  )}
                </span>
              </div>
              {currentLang === lang.code && (
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group flex items-center gap-2 h-12 rounded-full shadow-xl transition-all duration-300 cursor-pointer active:scale-95 ${
          isExpanded
            ? 'bg-purple-600 hover:bg-purple-700 px-5 shadow-purple-500/30'
            : 'bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/50 px-4 shadow-black/30 hover:shadow-lg'
        }`}
        aria-label="Change language"
      >
        {/* Globe icon */}
        <svg
          className={`w-5 h-5 transition-all duration-300 ${
            isExpanded ? 'text-white rotate-180' : 'text-zinc-300 group-hover:text-white'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isExpanded ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          )}
        </svg>

        {/* Show current language when collapsed */}
        {!isExpanded && (
          <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors pr-0.5">
            {activeLang.flag} {activeLang.nativeName}
          </span>
        )}

        {/* Show close hint when expanded */}
        {isExpanded && (
          <span className="text-xs font-semibold text-white/80">
            Close
          </span>
        )}
      </button>
    </div>
  );
}
