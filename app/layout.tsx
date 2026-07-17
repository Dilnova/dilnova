import type { Metadata } from 'next'
import React from 'react'
import { ClerkProvider, Show, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import ConsentTracking from '@/shared/ui/ConsentTracking'
import CookieConsent from '@/shared/ui/CookieConsent'
import { runWithCorrelationId } from '@/shared/security/async-context'
import HeaderAuthButtons from '@/shared/ui/HeaderAuthButtons'
import SmartHeader from '@/components/layout/SmartHeader'
import SmartFooter from '@/components/layout/SmartFooter'
import './globals.css'

import { CartProvider } from '@/features/cart/context/CartContext'
import CartIcon from '@/features/cart/components/CartIcon'
import LanguageSelector from '@/shared/ui/language/LanguageSelector'
import dynamic from 'next/dynamic';

const LanguageSplash = dynamic(() => import('@/shared/ui/language/LanguageSplash'));
const CartMergeBanner = dynamic(() => import('@/features/cart/components/CartMergeBanner'));

import { getSystemSetting } from '@/shared/platform/settings'
import Image from 'next/image'
import { Toaster } from 'sonner'
import { ConfirmProvider } from '@/shared/ui/notifications'
import { GlobalNotificationListener } from '@/shared/ui/notifications/GlobalNotificationListener'
import { Inter } from 'next/font/google';

import { DynamicHeaderNav, DynamicOrganizationSwitcher } from '@/shared/ui/DynamicHeader';

const interFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getSystemSetting('system_favicon', '');
  const systemName = await getSystemSetting('system_name', 'Dilnova Commerce Hub');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dilstar.pp.ua';
  return {
    title: {
      template: `%s | ${systemName}`,
      default: systemName,
    },
    description: 'Enterprise RBAC sandbox with multi-vendor isolation',
    keywords: ['dilstar', 'dilstar marketplace', 'marketplace', 'multi-vendor', 'ecommerce', 'b2b', 'platform'],
    authors: [{ name: systemName }],
    creator: systemName,
    publisher: systemName,
    openGraph: {
      title: systemName,
      description: 'Enterprise RBAC sandbox with multi-vendor isolation',
      url: baseUrl,
      siteName: systemName,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: systemName,
      description: 'Enterprise RBAC sandbox with multi-vendor isolation',
      creator: '@dilnova',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: faviconUrl
      ? { icon: faviconUrl }
      : {
          icon: [
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          ],
          apple: [
            { url: '/apple-touch-icon.png', sizes: '180x180' },
          ],
        },
    manifest: '/site.webmanifest',
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: '/',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return runWithCorrelationId(async () => {
    const logoUrl = await getSystemSetting('system_logo', '');
    const systemName = await getSystemSetting('system_name', 'Dilnova');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dilstar.pp.ua';

    return (
      <html lang="en">
        <body className={`${interFont.variable} antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950`}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@graph': [
                  {
                    '@type': 'WebSite',
                    '@id': `${baseUrl}/#website`,
                    url: baseUrl,
                    name: systemName,
                    publisher: {
                      '@id': `${baseUrl}/#organization`
                    },
                  },
                  {
                    '@type': 'Organization',
                    '@id': `${baseUrl}/#organization`,
                    name: systemName,
                    url: baseUrl,
                    logo: {
                      '@type': 'ImageObject',
                      url: logoUrl || `${baseUrl}/apple-touch-icon.png`
                    }
                  }
                ]
              })
            }}
          />
          <ClerkProvider>
            <ConfirmProvider>
              <CartProvider>
              <SmartHeader>
                {/* Background layer to prevent backdrop-blur from creating a containing block for fixed children */}
                <div className="absolute inset-0 backdrop-blur-md -z-10 pointer-events-none" aria-hidden="true" />
                
                <div className="flex items-center gap-2 sm:gap-3 md:gap-5 min-w-0 flex-1">
                  <Link href="/" className="font-extrabold text-sm tracking-wider text-zinc-900 dark:text-zinc-50 hover:opacity-90 flex items-center shrink min-w-[5rem]">
                    {logoUrl ? (
                      <div className="relative h-8 w-20 sm:h-9 sm:w-32 max-w-full rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700/60">
                        <Image
                          src={logoUrl}
                          alt={`${systemName} Logo`}
                          fill
                          className="object-contain object-center"
                          sizes="(max-width: 640px) 80px, 128px"
                          priority
                        />
                      </div>
                    ) : (
                      systemName.toUpperCase()
                    )}
                  </Link>
                  {/* Removed overflow-hidden to prevent clipping the mobile hamburger menu */}
                  <div className="flex-1 flex items-center min-w-0">
                    <DynamicHeaderNav mobileExtra={<LanguageSelector />} />
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0 ml-2">
                  <div className="hidden lg:block">
                    <LanguageSelector />
                  </div>
                  
                  {/* Shopping Cart Icon (Link to page) */}
                  <CartIcon />

                  <Show when="signed-out">
                    <HeaderAuthButtons />
                  </Show>

                  <Show when="signed-in">
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
                      <DynamicOrganizationSwitcher />
                      <UserButton />
                    </div>
                  </Show>
                </div>
              </SmartHeader>
              {children}
              <SmartFooter>
                <footer className="border-t border-zinc-200 dark:border-zinc-900 py-10 text-center md:text-left text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 mt-auto">
                  <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
                    <div className="flex flex-col space-y-1">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{systemName}</p>
                      <p>Colombo, Sri Lanka</p>
                      <p className="pt-4">&copy; {new Date().getFullYear()} {systemName}. All rights reserved.</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 font-medium">
                      <div className="flex flex-col space-y-2">
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold mb-1 uppercase tracking-wider text-[10px]">Legal</span>
                        <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Privacy Policy</Link>
                        <Link href="/cookie" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Cookie Policy</Link>
                        <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Terms of Service</Link>
                        <Link href="/refund" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Refund Policy</Link>
                      </div>
                      <div className="flex flex-col space-y-2 mt-4 md:mt-0">
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold mb-1 uppercase tracking-wider text-[10px]">Support</span>
                        <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Contact Us</Link>
                      </div>
                    </div>
                  </div>
                </footer>
              </SmartFooter>
              <LanguageSplash systemName={systemName} />
              <CartMergeBanner />
            </CartProvider>
            <GlobalNotificationListener />
            <Toaster 
              position="top-right" 
              toastOptions={{ className: 'text-xs font-semibold', duration: 4000 }} 
              richColors 
              closeButton 
              theme="system" 
            />
            </ConfirmProvider>
            <ConsentTracking />
            <CookieConsent />
          </ClerkProvider>
        </body>
      </html>
    );
  });
}