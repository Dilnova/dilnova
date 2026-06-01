import type { Metadata } from 'next'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { runWithCorrelationId } from '@/utils/asyncContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dilnova Commerce Hub',
  description: 'Enterprise RBAC sandbox with multi-vendor isolation',
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

    return (
      <html lang="en">
        <body className="antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
          <ClerkProvider>
            <header className="flex justify-between items-center px-6 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 h-16">
              <div className="flex items-center gap-6">
                <Link href="/" className="font-extrabold text-sm tracking-wider text-zinc-900 dark:text-zinc-50 hover:opacity-90">
                  DILNOVA
                </Link>
                <Link href="/vendors" className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                  Browse Vendors
                </Link>
                <Link href="/products" className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                  Products & Services
                </Link>
                {orgId && (orgRole === 'org:admin' || orgRole === 'org:vendor') && (
                  <Link href="/vendor/products" className="text-xs font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors">
                    Add Items
                  </Link>
                )}
                {userRole === 'admin' && (
                  <Link href="/superadmin" className="text-xs font-bold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                    Superadmin Console
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Show when="signed-out">
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <SignInButton />
                    <SignUpButton>
                      <button className="bg-purple-700 text-white rounded-lg h-9 px-4 cursor-pointer hover:bg-purple-800 transition-colors">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </div>
                </Show>

                <Show when="signed-in">
                  <div className="flex items-center gap-4">
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
            <SpeedInsights />
          </ClerkProvider>
        </body>
      </html>
    );
  });
}