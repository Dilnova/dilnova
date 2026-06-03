'use client';

import { useEffect, useState } from 'react';
import {
  LANGUAGES,
  getLangPreference,
  detectBrowserLanguage,
  applyLanguage,
} from './languageUtils';

export default function LanguageSplash() {
  const [visible, setVisible] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [detectedLang, setDetectedLang] = useState('en');

  useEffect(() => {
    // Only show if user has never picked a language
    const pref = getLangPreference();
    if (pref) return; // Already chose before — don't show

    const detected = detectBrowserLanguage();
    setDetectedLang(detected);
    setVisible(true);

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

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-500 ${
        animatingOut ? 'lang-splash-exit' : 'lang-splash-enter'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-2xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-3xl w-full">
        {/* Multi-language greeting header */}
        <div className="text-center space-y-3 lang-splash-header">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
            🌐 Select Your Language
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Welcome{' '}
            <span className="text-purple-400">·</span>{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              සාදරයෙන් පිළිගනිමු
            </span>{' '}
            <span className="text-purple-400">·</span>{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              வரவேற்கிறோம்
            </span>
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Choose your preferred language to continue. You can change this anytime.
          </p>
        </div>

        {/* Language cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
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
                className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 cursor-pointer lang-splash-card ${
                  isSelected
                    ? 'border-purple-500 scale-[1.03] shadow-2xl shadow-purple-500/20'
                    : isDetected
                    ? `${colors.border} ring-2 ring-purple-500/30 ${colors.bg}`
                    : `${colors.border} ${colors.bg} hover:border-zinc-600 hover:scale-[1.02]`
                }`}
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                {/* Glow effect */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full ${colors.glow} blur-3xl pointer-events-none transition-all duration-500 group-hover:opacity-100 opacity-60`} />

                {/* Detected badge */}
                {isDetected && (
                  <div className={`absolute top-3 right-3 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.badge}`}>
                    Auto-detected
                  </div>
                )}

                <div className="relative z-10 space-y-4">
                  {/* Flag */}
                  <span className="text-4xl block">{lang.flag}</span>

                  {/* Native greeting */}
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {lang.greeting}
                  </h2>

                  {/* Native name */}
                  <p className={`text-lg font-bold ${colors.text}`}>
                    {lang.nativeName}
                  </p>

                  {/* Subtitle (in that language) */}
                  <p className="text-xs text-zinc-400">
                    {lang.subtitle}
                  </p>

                  {/* English fallback name (only for non-English) */}
                  {lang.code !== 'en' && (
                    <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                      {lang.name}
                    </p>
                  )}
                </div>

                {/* Bottom arrow indicator */}
                <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                  <span>{lang.code === 'en' ? 'Select' : lang.code === 'si' ? 'තෝරන්න' : 'தேர்ந்தெடு'}</span>
                  <svg className="w-3 h-3 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Subtle footer hint */}
        <p className="text-[10px] text-zinc-600 text-center font-mono uppercase tracking-wider">
          You can change your language anytime from the menu
        </p>
      </div>
    </div>
  );
}
