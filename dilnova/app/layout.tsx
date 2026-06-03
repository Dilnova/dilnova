import type { Metadata } from 'next'
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

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getSystemSetting('system_favicon', '');
  return {
    title: 'Dilnova Commerce Hub',
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
      canCreateOrg = orgRole === 'org:admin' || orgRole === 'org:vendor';
    } else {
      canCreateOrg = isUserVendorOrAdmin;
    }

    // Build responsive links dynamically based on user session status and permissions
    const links: { href: string; label: string; colorClass?: string }[] = [
      { href: '/vendors', label: 'Browse Vendors' },
      { href: '/products', label: 'Products & Services' },
      { href: '/contact', label: 'Contact Us' },
    ];

    if (orgId && (orgRole === 'org:admin' || orgRole === 'org:vendor')) {
      links.push({
        href: '/vendor/products',
        label: 'Manage Catalog',
        colorClass: 'text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300',
      });
      links.push({
        href: '/vendor/products/add',
        label: '+ Add Item',
        colorClass: 'text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300',
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

    return (
      <html lang="en">
        <body className="antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
          <ClerkProvider>
            <CartProvider>
              <header className="flex justify-between items-center px-4 md:px-6 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 h-16">
                <div className="flex items-center gap-3 md:gap-6">
                  <Link href="/" className="font-extrabold text-sm tracking-wider text-zinc-900 dark:text-zinc-50 hover:opacity-90 flex items-center">
                    {logoUrl ? (
                      <div className="relative h-8 w-28">
                        <Image
                          src={logoUrl}
                          alt="Dilnova Logo"
                          fill
                          className="object-contain object-left"
                          priority
                        />
                      </div>
                    ) : (
                      'DILNOVA'
                    )}
                  </Link>
                  <HeaderNav links={links} />
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  {/* Language Selector Dropdown */}
                  <LanguageSelector />

                  {/* Shopping Cart Icon (Link to page) */}
                  <CartIcon />

                  <Show when="signed-out">
                    <div className="flex items-center gap-2 md:gap-3 text-xs font-semibold">
                      <SignInButton />
                      <SignUpButton>
                        <button className="bg-purple-700 text-white rounded-lg h-9 px-3 md:px-4 cursor-pointer hover:bg-purple-800 transition-colors">
                          Sign Up
                        </button>
                      </SignUpButton>
                    </div>
                  </Show>

                  <Show when="signed-in">
                    <div className="flex items-center gap-2 md:gap-4">
                      <OrganizationSwitcher 
                        afterCreateOrganizationUrl="/" 
                        afterSelectOrganizationUrl="/"
                        appearance={{
                          elements: {
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
              <LanguageSplash />
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