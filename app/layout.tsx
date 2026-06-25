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

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getSystemSetting('system_favicon', '');
  const systemName = await getSystemSetting('system_name', 'Dilnova Commerce Hub');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dilstar.pp.ua';
  return {
    title: systemName,
    description: 'Enterprise RBAC sandbox with multi-vendor isolation',
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
      { href: '/vendors', label: 'Browse Vendors' },
      { href: '/products', label: 'Products & Services' },
      { href: '/contact', label: 'Contact Us' },
    ];

    if (orgId && (orgRole === 'org:admin' || orgRole === 'org:member')) {
      links.push({
        href: '/vendor',
        label: 'Storefront Console',
        colorClass: 'text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-semibold',
      });
    }

    if (orgId && orgRole === 'org:admin') {
      links.push({
        href: '/admin',
        label: 'Org Admin Console',
        colorClass: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold',
      });
    }

    if (orgId && (orgRole === 'org:admin' || orgRole === 'org:member')) {
      links.push({
        href: '/vendor/products/add',
        label: '+ Add Item',
        colorClass: 'text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300',
      });
    }

    if (userId) {
      links.push({
        href: '/customer',
        label: 'Customer Portal',
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

    if (isSuperAdmin) {
      links.push({
        href: '/superadmin',
        label: 'Superadmin Console',
        colorClass: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-bold',
      });
    }

    const logoUrl = await getSystemSetting('system_logo', '');
    const systemName = await getSystemSetting('system_name', 'Dilnova');

    return (
      <html lang="en">
        <body className="antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-x-hidden">
          <ClerkProvider nonce={nonce}>
            <CartProvider>
              <header className="relative flex justify-between items-center px-3 sm:px-4 md:px-6 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 h-14 sm:h-16 overflow-visible max-w-full">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-5 min-w-0 flex-1 overflow-hidden">
                  <Link href="/" className="font-extrabold text-sm tracking-wider text-zinc-900 dark:text-zinc-50 hover:opacity-90 flex items-center shrink-0">
                    {logoUrl ? (
                      <div className="relative h-8 w-28 sm:h-9 sm:w-32 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700/60">
                        <Image
                          src={logoUrl}
                          alt={`${systemName} Logo`}
                          fill
                          className="object-contain object-center"
                          sizes="(max-width: 640px) 112px, 128px"
                          priority
                        />
                      </div>
                    ) : (
                      systemName.toUpperCase()
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <HeaderNav links={links} />
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
                  {/* Language Selector Dropdown - hidden on very small screens since FloatingLanguageButton covers it */}
                  <div className="hidden sm:block">
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
              </header>
              {children}
              <footer className="border-t border-zinc-200 dark:border-zinc-900 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 mt-auto">
                <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p>&copy; {new Date().getFullYear()} {systemName} Marketplace. All rights reserved.</p>
                  <div className="flex items-center gap-6 font-medium">
                    <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Terms of Service</Link>
                  </div>
                </div>
              </footer>
              <LanguageSplash systemName={systemName} />
              <CartMergeBanner />
            </CartProvider>
            <ConsentTracking initialConsent={initialConsent} />
            <CookieConsent />
          </ClerkProvider>
        </body>
      </html>
    );
  });
}