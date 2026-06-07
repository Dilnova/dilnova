'use client';

import { useEffect, useState } from 'react';
import {
  LANGUAGES,
  getLangPreference,
  detectBrowserLanguage,
  applyLanguage,
} from './languageUtils';

interface LanguageSplashProps {
  systemName?: string;
}

export default function LanguageSplash({ systemName = 'Dilnova' }: LanguageSplashProps) {
  const [visible, setVisible] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [detectedLang, setDetectedLang] = useState('en');

  useEffect(() => {
    // Only show if user has never picked a language
    const pref = getLangPreference();
    if (pref) return; // Already chose before — don't show

    const detected = detectBrowserLanguage();
    requestAnimationFrame(() => {
      setDetectedLang(detected);
      setVisible(true);
    });

    // Lock body scroll while splash is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSelect = (langCode: string) => {
    setSelectedCode(langCode);
    setAnimatingOut(true);

    // Brief delay for the exit animation, then apply
    setTimeout(() => {
      document.body.style.overflow = '';
      applyLanguage(langCode, true);
    }, 500);
  };

  if (!visible) return null;  return (
    <div
      className={`fixed inset-0 z-[99999] overflow-y-auto bg-zinc-950/90 backdrop-blur-2xl transition-opacity duration-500 ${
        animatingOut ? 'lang-splash-exit' : 'lang-splash-enter'
      }`}
    >
      <div className="min-h-full w-full flex items-center justify-center px-4 py-8 md:py-16">
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 max-w-3xl w-full my-auto">
          {/* Multi-language greeting header */}
          <div className="text-center space-y-4 max-w-xl lang-splash-header">
            {/* Pulsing premium logo placeholder/icon */}
            <div className="relative mx-auto w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-2">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-2xl blur-md opacity-30 pointer-events-none" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
              🛒 {systemName} Commerce Hub
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome to <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">{systemName}</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
              Your premium gateway to multi-vendor storefronts. Please select your language to customize your shopping experience.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-zinc-500 font-semibold mt-2">
              <span>දිල්නෝවා වෙත සාදරයෙන් පිළිගනිමු</span>
              <span className="text-zinc-700">•</span>
              <span>டில்னோவாவிற்கு வரவேற்கிறோம்</span>
            </div>
          </div>

          {/* Language cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            {LANGUAGES.map((lang, index) => {
              const isDetected = lang.code === detectedLang && detectedLang !== 'en';
              const isSelected = lang.code === selectedCode;

              // Color schemes per language
              const colorMap: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
                en: {
                  bg: 'bg-zinc-900/60',
                  border: 'border-zinc-700/40',
                  glow: 'bg-purple-500/10',
                  text: 'text-purple-400',
                  badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                },
                si: {
                  bg: 'bg-zinc-900/60',
                  border: 'border-zinc-700/40',
                  glow: 'bg-amber-500/10',
                  text: 'text-amber-400',
                  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                },
                ta: {
                  bg: 'bg-zinc-900/60',
                  border: 'border-zinc-700/40',
                  glow: 'bg-emerald-500/10',
                  text: 'text-emerald-400',
                  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                },
              };
              const colors = colorMap[lang.code] || colorMap.en;

              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-6 text-left transition-all duration-300 cursor-pointer lang-splash-card w-full flex sm:flex-col items-center sm:items-start gap-4 sm:gap-4 ${
                    isSelected
                      ? 'border-purple-500 scale-[1.02] shadow-2xl shadow-purple-500/20'
                      : isDetected
                      ? `${colors.border} ring-2 ring-purple-500/30 ${colors.bg}`
                      : `${colors.border} ${colors.bg} hover:border-zinc-600 hover:scale-[1.01]`
                  }`}
                  style={{ animationDelay: `${index * 100 + 200}ms` }}
                >
                  {/* Glow effect */}
                  <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full ${colors.glow} blur-3xl pointer-events-none transition-all duration-500 group-hover:opacity-100 opacity-60`} />

                  {/* Detected badge */}
                  {isDetected && (
                    <div className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 text-[8px] sm:text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.badge}`}>
                      Auto
                    </div>
                  )}

                  {/* Flag */}
                  <span className="text-3xl sm:text-4xl block flex-shrink-0 leading-none">{lang.flag}</span>

                  {/* Content */}
                  <div className="relative z-10 flex-grow sm:space-y-2">
                    {/* Mobile-friendly flex layout that becomes block on desktop */}
                    <div className="flex flex-col sm:block text-left">
                      <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight leading-snug">
                        {lang.greeting}
                      </h2>
                      <p className={`text-sm sm:text-lg font-bold sm:mt-1 ${colors.text}`}>
                        {lang.nativeName}
                      </p>
                    </div>
                    
                    <p className="text-xs text-zinc-400 mt-1 sm:mt-0 leading-normal">
                      {lang.subtitle}
                    </p>

                    {lang.code !== 'en' && (
                      <p className="text-[9px] text-zinc-650 font-mono uppercase tracking-wider mt-1 hidden sm:block">
                        {lang.name}
                      </p>
                    )}
                  </div>

                  {/* Bottom arrow indicator */}
                  <div className={`ml-auto sm:ml-0 sm:mt-2 flex items-center gap-1 text-xs font-semibold ${colors.text} opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                    <span className="hidden sm:inline">{lang.code === 'en' ? 'Select' : lang.code === 'si' ? 'තෝරන්න' : 'தேர்ந்தெடு'}</span>
                    <svg className="w-4 h-4 sm:w-3 sm:h-3 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Subtle footer hint */}
          <p className="text-[10px] text-zinc-650 text-center font-mono uppercase tracking-wider mt-2">
            You can change your language anytime from the menu
          </p>
        </div>
      </div>
    </div>
  );
}
