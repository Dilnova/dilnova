'use client';

import { useState } from 'react';
import Link from 'next/link';

interface LinkItem {
  href: string;
  label: string;
  colorClass?: string;
}

interface HeaderNavProps {
  links: LinkItem[];
}

export default function HeaderNav({ links }: HeaderNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
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
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-600/50"
        aria-label="Toggle navigation menu"
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

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg shadow-lg py-4 px-6 flex flex-col gap-4 md:hidden z-40 transition-all duration-200 ease-in-out">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`text-sm font-semibold transition-colors py-2 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 ${
                link.colorClass || 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
