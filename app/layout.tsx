import type { Metadata } from 'next'
import React from 'react'
import { ClerkProvider, Show, UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import { headers, cookies } from 'next/headers'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import ConsentTracking from '@/shared/ui/ConsentTracking'
import CookieConsent from '@/shared/ui/CookieConsent'
import { runWithCorrelationId } from '@/shared/security/async-context'
import HeaderNav from '@/shared/ui/HeaderNav'
import HeaderAuthButtons from '@/shared/ui/HeaderAuthButtons'
import SmartHeader from '@/components/layout/SmartHeader'
import SmartFooter from '@/components/layout/SmartFooter'
import './globals.css'

import { CartProvider } from '@/features/cart/context/CartContext'
import CartIcon from '@/features/cart/components/CartIcon'
import LanguageSelector from '@/shared/ui/language/LanguageSelector'
import LanguageSplash from '@/shared/ui/language/LanguageSplash'
import CartMergeBanner from '@/features/cart/components/CartMergeBanner'

import { getSystemSetting } from '@/shared/platform/settings'
import Image from 'next/image'
import { getPremiumStatus } from '@/features/inventory/premium-license'
import { getCachedUserRole, getCachedIsSuperAdmin } from '@/shared/auth/clerk-cache'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'sonner'
import { ConfirmProvider } from '@/shared/ui/notifications'
import { GlobalNotificationListener } from '@/shared/ui/notifications/GlobalNotificationListener'

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
    const { orgId, orgRole, userId } = await auth();
    const requestHeaders = await headers();
    const cookieStore = await cookies();
    const nonce = requestHeaders.get('x-nonce') || undefined;
    const initialConsent = cookieStore.get('dilnova_cookie_consent')?.value === 'accepted';
    let userRole: string | undefined = undefined;
    let isSuperAdmin = false;
    if (userId) {
      [userRole, isSuperAdmin] = await Promise.all([
        getCachedUserRole(userId),
        getCachedIsSuperAdmin(userId),
      ]);
    }

    // RBAC check: can the user create organizations?
    // 1. If user is in an active organization context, check if they are an admin or vendor
    // 2. If user is not in an organization context, check if their user-level metadata role is vendor or they are superadmin
    const isUserVendorOrAdmin = userRole === 'vendor' || isSuperAdmin;

    let canCreateOrg = false;
    if (orgId) {
      canCreateOrg = orgRole === 'org:admin' || orgRole === 'org:member';
    } else {
      canCreateOrg = isUserVendorOrAdmin;
    }

    let billingActive = false;
    if (orgId) {
      const status = await getPremiumStatus(orgId);
      billingActive = status.billingActive;
    }

    // Build responsive links dynamically based on user session status and permissions
    const links: { href: string; label: string; colorClass?: string }[] = [
      { href: '/vendors', label: 'Vendors' },
      { href: '/products', label: 'Products' },
      { href: '/contact', label: 'Support' },
    ];

    if (orgId && orgRole === 'org:admin') {
      links.push({
        href: '/vendor',
        label: 'Dashboard',
        colorClass: 'text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-semibold',
      });
    }

    if (orgId && (orgRole === 'org:admin' || orgRole === 'org:member')) {
      links.push({
        href: '/vendor/products/add',
        label: 'Create',
        colorClass: 'text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300',
      });
    }

    if (userId) {
      links.push({
        href: '/customer',
        label: 'Account',
        colorClass: 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold',
      });
    }

    if (orgId && billingActive && (orgRole === 'org:admin' || orgRole === 'org:member')) {
      links.push({
        href: '/vendor/billing',
        label: 'POS Register',
        colorClass: 'text-indigo-650 hover:text-indigo-850 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold',
      });
    }

    if (orgId && orgRole === 'org:admin') {
      links.push({
        href: '/admin',
        label: 'Admin',
        colorClass: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold',
      });
    }

    if (isSuperAdmin) {
      links.push({
        href: '/superadmin',
        label: 'Superadmin',
        colorClass: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-bold',
      });
    }

    const logoUrl = await getSystemSetting('system_logo', '');
    const systemName = await getSystemSetting('system_name', 'Dilnova');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dilstar.pp.ua';

    return (
      <html lang="en">
        <body className="antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
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
          <ClerkProvider nonce={nonce}>
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
                    <HeaderNav links={links} mobileExtra={<LanguageSelector />} />
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
                      <OrganizationSwitcher 
                        afterCreateOrganizationUrl="/" 
                        afterSelectOrganizationUrl="/"
                        afterLeaveOrganizationUrl="/"
                        afterSelectPersonalUrl="/"
                        hidePersonal={false}
                        appearance={{
                          elements: {
                            organizationSwitcherTrigger: 'dark:[&_*]:!text-zinc-50',
                            organizationSwitcherPopoverActionButton__createOrganization: canCreateOrg ? 'flex' : 'hidden',
                            organizationSwitcherPopoverCreateOrganization: canCreateOrg ? 'flex' : 'hidden',
                          }
                        }}
                      />
                      <UserButton />
                    </div>
                  </Show>
                </div>
              </SmartHeader>
              {children}
              <SmartFooter>
                <footer className="border-t border-zinc-200 dark:border-zinc-900 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 mt-auto">
                  <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>&copy; {new Date().getFullYear()} {systemName}. All rights reserved.</p>
                    <div className="flex items-center gap-6 font-medium">
                      <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Privacy Policy</Link>
                      <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Terms of Service</Link>
                    </div>
                  </div>
                </footer>
              </SmartFooter>
              <LanguageSplash systemName={systemName} />
              <CartMergeBanner />
            </CartProvider>
            <GlobalNotificationListener userId={userId} />
            <Toaster 
              position="top-right" 
              toastOptions={{ className: 'text-xs font-semibold', duration: 4000 }} 
              richColors 
              closeButton 
              theme="system" 
            />
            </ConfirmProvider>
            <ConsentTracking initialConsent={initialConsent} />
            <CookieConsent />
          </ClerkProvider>
        </body>
      </html>
    );
  });
}