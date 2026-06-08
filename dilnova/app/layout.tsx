import type { Metadata } from 'next'
import React from 'react'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { runWithCorrelationId } from '@/utils/asyncContext'
import HeaderNav from './HeaderNav'
import './globals.css'

import { CartProvider } from './context/CartContext'
import CartIcon from './components/CartIcon'
import LanguageSelector from './components/LanguageSelector'
import LanguageSplash from './components/LanguageSplash'
import FloatingLanguageButton from './components/FloatingLanguageButton'

import { getSystemSetting } from '@/utils/settings'
import Image from 'next/image'
import { getPremiumStatus } from '@/utils/premiumLicense'

const SignUpTriggerButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    return (
      <button
        {...props}
        ref={ref}
        className="bg-purple-700 text-white rounded-lg h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 text-[11px] sm:text-xs cursor-pointer hover:bg-purple-800 transition-colors whitespace-nowrap"
      >
        Sign Up
      </button>
    )
  }
)
SignUpTriggerButton.displayName = 'SignUpTriggerButton'



export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getSystemSetting('system_favicon', '');
  const systemName = await getSystemSetting('system_name', 'Dilnova Commerce Hub');
  return {
    title: systemName,
    description: 'Enterprise RBAC sandbox with multi-vendor isolation',
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return runWithCorrelationId(async () => {
    const { orgId, orgRole } = await auth();
    const user = await currentUser();

    // RBAC check: can the user create organizations?
    // 1. If user is in an active organization context, check if they are an admin or vendor
    // 2. If user is not in an organization context, check if their user-level metadata role is admin or vendor
    const userRole = user?.publicMetadata?.role as string | undefined;
    const isUserVendorOrAdmin = userRole === 'admin' || userRole === 'vendor';

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

    if (orgId && orgRole === 'org:admin') {
      links.push({
        href: '/vendor/products',
        label: 'Manage Catalog',
        colorClass: 'text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300',
      });
    }

    if (orgId && (orgRole === 'org:admin' || orgRole === 'org:member')) {
      links.push({
        href: '/vendor/products/add',
        label: '+ Add Item',
        colorClass: 'text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300',
      });
    }

    if (orgId && orgRole === 'org:admin') {
      links.push({
        href: '/admin',
        label: 'Admin Console',
        colorClass: 'text-rose-600 hover:text-rose-800 dark:text-rose-450 dark:hover:text-rose-350 font-semibold',
      });
    }

    if (orgId && billingActive && (orgRole === 'org:admin' || orgRole === 'org:member')) {
      links.push({
        href: '/vendor/billing',
        label: 'POS Register',
        colorClass: 'text-indigo-650 hover:text-indigo-850 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold',
      });
    }

    if (userRole === 'admin') {
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
          <ClerkProvider>
            <CartProvider>
              <header className="relative flex justify-between items-center px-3 sm:px-4 md:px-6 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 h-14 sm:h-16 overflow-visible max-w-full">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-6 min-w-0 flex-shrink">
                  <Link href="/" className="font-extrabold text-sm tracking-wider text-zinc-900 dark:text-zinc-50 hover:opacity-90 flex items-center flex-shrink-0">
                    {logoUrl ? (
                      <div className="relative h-7 w-24 sm:h-8 sm:w-28">
                        <Image
                          src={logoUrl}
                          alt={`${systemName} Logo`}
                          fill
                          className="object-contain object-left"
                          sizes="(max-width: 640px) 96px, 112px"
                          priority
                        />
                      </div>
                    ) : (
                      systemName.toUpperCase()
                    )}
                  </Link>
                  <HeaderNav links={links} />
                </div>

                <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
                  {/* Language Selector Dropdown - hidden on very small screens since FloatingLanguageButton covers it */}
                  <div className="hidden sm:block">
                    <LanguageSelector />
                  </div>

                  {/* Shopping Cart Icon (Link to page) */}
                  <CartIcon />

                  <Show when="signed-out">
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-xs font-semibold">
                      <SignInButton />
                      <SignUpButton>
                        <SignUpTriggerButton />
                      </SignUpButton>
                    </div>
                  </Show>

                  <Show when="signed-in">
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
                      <div className="hidden sm:block">
                        <OrganizationSwitcher 
                          afterCreateOrganizationUrl="/" 
                          afterSelectOrganizationUrl="/"
                          afterLeaveOrganizationUrl="/"
                          afterSelectPersonalUrl="/"
                          hidePersonal={false}
                          appearance={{
                            elements: {
                              organizationSwitcherPopoverActionButton__createOrganization: canCreateOrg ? 'flex' : 'hidden',
                              organizationSwitcherPopoverCreateOrganization: canCreateOrg ? 'flex' : 'hidden',
                            }
                          }}
                        />
                      </div>
                      <UserButton />
                    </div>
                  </Show>
                </div>
              </header>
              {children}
              <LanguageSplash systemName={systemName} />
              <FloatingLanguageButton />
            </CartProvider>
            <SpeedInsights />
            <Analytics />
          </ClerkProvider>
        </body>
      </html>
    );
  });
}