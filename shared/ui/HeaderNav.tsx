'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';

interface LinkItem {
  href: string;
  label: string;
  colorClass?: string;
}

interface HeaderNavProps {
  links: LinkItem[];
  mobileExtra?: ReactNode;
}

export default function HeaderNav({ links, mobileExtra }: HeaderNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  }, []);

  // Close when clicking outside of the mobile toggle and the menu panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open on mobile
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-xs font-semibold transition-colors ${
              link.colorClass || 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mobile Hamburger Toggle */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-600/50 flex-shrink-0"
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay + Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Menu panel - fixed below header */}
          <div
            ref={menuRef}
            className="fixed top-14 sm:top-16 left-0 right-0 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/98 dark:bg-zinc-950/98 backdrop-blur-xl shadow-2xl py-3 px-5 flex flex-col gap-1 lg:hidden z-50"
            style={{ animation: 'mobileMenuSlideDown 0.2s ease-out' }}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block truncate text-sm font-semibold transition-colors py-3 px-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900/60 ${
                  link.colorClass || 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {mobileExtra && (
              <>
                <div className="border-t border-zinc-200/60 dark:border-zinc-800 my-1" />
                <div className="px-3 py-2">
                  {mobileExtra}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
