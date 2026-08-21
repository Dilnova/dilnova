import type { Metadata } from "next";
import { headers } from "next/headers";
import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import ConsentTracking from "@/shared/ui/ConsentTracking";
import CookieConsent from "@/shared/ui/CookieConsent";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";
import { runWithCorrelationId } from "@/shared/security/async-context";
import SmartHeader from "@/components/layout/SmartHeader";
import SmartFooter from "@/components/layout/SmartFooter";
import "./globals.css";

import { CartProvider } from "@/features/cart/context/cart-context";
import CartIcon from "@/features/cart/components/CartIcon";
import LanguageSelector from "@/shared/ui/language/LanguageSelector";
import CurrencySelector from "@/shared/ui/currency/CurrencySelector";
import { CurrencyProvider } from "@/shared/currency/context/currency-context";
import { getExchangeRatesMap } from "@/shared/currency/exchange-rates.service";
import dynamic from "next/dynamic";

const LanguageSplash = dynamic(() => import("@/shared/ui/language/LanguageSplash"));
const CartMergeBanner = dynamic(() => import("@/features/cart/components/CartMergeBanner"));

import { getSystemSetting } from "@/shared/platform/settings";
import Image from "next/image";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/shared/ui/notifications";
import { Inter } from "next/font/google";

import { DynamicHeaderNav, DynamicHeaderAuth } from "@/shared/ui/DynamicHeader";
import { auth } from "@clerk/nextjs/server";
import { getClientSessionContextAction } from "@/shared/auth/session.actions";

const interFont = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const isDilstar = host.includes("dilstar.pp.ua");

  const faviconUrl = await getSystemSetting("system_favicon", "");
  const systemName = isDilstar
    ? "Distar"
    : await getSystemSetting("system_name", "Dilnova Commerce Hub");

  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = host
    ? `${protocol}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

  const siteTitle = isDilstar ? "Distar | Industrial Motors & Hardware" : systemName;

  const siteDescription = isDilstar
    ? "Official store for Distar industrial motors, heavy hardware, workstations, botanical flora, and services."
    : "Enterprise multi-vendor commerce hub and curated marketplace.";

  const keywords = isDilstar
    ? [
        "distar",
        "distar motors",
        "industrial induction motor",
        "contractor tools",
        "distar tech",
        "distar nursery",
        "dilstar services",
      ]
    : [
        "dilnova",
        "dilnova commerce hub",
        "marketplace",
        "multi-vendor",
        "ecommerce",
        "distar",
        "b2b platform",
      ];

  return {
    title: {
      template: `%s | ${systemName}`,
      default: siteTitle,
    },
    description: siteDescription,
    keywords,
    authors: [{ name: systemName }],
    creator: systemName,
    publisher: systemName,
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: baseUrl,
      siteName: systemName,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      creator: isDilstar ? "@dilstar" : "@dilnova",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: faviconUrl
      ? { icon: faviconUrl }
      : {
          icon: [
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
          ],
          apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
        },
    manifest: "/site.webmanifest",
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: "/",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return runWithCorrelationId(async () => {
    const logoUrl = await getSystemSetting("system_logo", "");
    const systemName = await getSystemSetting("system_name", "Dilnova");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

    // Fetch initial auth & session context server-side to prevent dynamic header pop-in delay
    let userId: string | null = null;
    let orgId: string | null = null;
    let orgRole: string | null = null;

    try {
      const authState = await auth();
      userId = authState.userId ?? null;
      orgId = authState.orgId ?? null;
      orgRole = authState.orgRole ?? null;
    } catch {
      // Fallback gracefully if auth() runs outside of clerkMiddleware matcher (e.g. 404 fallback for static assets)
    }

    const initialAuth = {
      userId,
      orgId,
      orgRole,
    };
    const initialSessionContext = userId ? await getClientSessionContextAction() : null;
    const initialRatesMap = await getExchangeRatesMap();

    const headersList = await headers();
    // Enterprise-grade dynamic Beta Lock check
    const isBetaLocked = (await getSystemSetting("enable_beta_lock", "false")) === "true";
    const isCI =
      process.env.CI === "true" ||
      process.env.VERCEL_ENV === "preview" ||
      process.env.NODE_ENV === "test";
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const incomingSecret = headersList.get("x-vercel-protection-bypass");
    const hasValidSecret = Boolean(
      bypassSecret && incomingSecret && bypassSecret === incomingSecret,
    );

    if (isBetaLocked && !isCI && !hasValidSecret) {
      return (
        <html lang="en">
          <body
            className={`${interFont.variable} antialiased min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6`}
          >
            <div className="max-w-md text-center space-y-6 bg-white dark:bg-zinc-900 p-10 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{systemName} is Coming Soon</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                We are currently in a closed beta phase. Our marketplace will be launching to the
                public soon. Thank you for your patience!
              </p>
            </div>
          </body>
        </html>
      );
    }

    return (
      <html lang="en">
        <body
          className={`${interFont.variable} antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950`}
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "WebSite",
                    "@id": `${baseUrl}/#website`,
                    url: baseUrl,
                    name: systemName,
                    publisher: {
                      "@id": `${baseUrl}/#organization`,
                    },
                    potentialAction: {
                      "@type": "SearchAction",
                      target: {
                        "@type": "EntryPoint",
                        urlTemplate: `${baseUrl}/products?search={search_term_string}`,
                      },
                      "query-input": "required name=search_term_string",
                    },
                  },
                  {
                    "@type": "Organization",
                    "@id": `${baseUrl}/#organization`,
                    name: systemName,
                    url: baseUrl,
                    logo: {
                      "@type": "ImageObject",
                      url: logoUrl || `${baseUrl}/apple-touch-icon.png`,
                    },
                  },
                ],
              }).replace(/</g, "\\u003c"),
            }}
          />
          <ClerkProvider>
            <ConfirmProvider>
              <CurrencyProvider initialRatesMap={initialRatesMap}>
                <CartProvider>
                  <SmartHeader>
                    {/* Background layer to prevent backdrop-blur from creating a containing block for fixed children */}
                    <div
                      className="absolute inset-0 backdrop-blur-md -z-10 pointer-events-none"
                      aria-hidden="true"
                    />

                    <div className="flex items-center gap-3 sm:gap-4 md:gap-6 shrink-0">
                      <Link
                        href="/"
                        className="font-extrabold text-sm sm:text-base tracking-wider text-zinc-900 dark:text-zinc-50 hover:opacity-90 flex items-center shrink-0"
                      >
                        {logoUrl ? (
                          <div className="relative h-8 w-20 sm:h-9 sm:w-32 max-w-full rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700/60 shrink-0">
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
                          <span className="shrink-0 whitespace-nowrap">
                            {systemName.toUpperCase()}
                          </span>
                        )}
                      </Link>
                      <div className="flex items-center shrink-0">
                        <DynamicHeaderNav
                          initialAuth={initialAuth}
                          initialSessionContext={initialSessionContext}
                          mobileExtra={
                            <div className="flex items-center gap-2">
                              <LanguageSelector align="left" />
                              <CurrencySelector align="left" />
                            </div>
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3.5 md:gap-5 shrink-0 min-w-0 ml-auto">
                      <div className="hidden lg:flex items-center gap-2 shrink-0">
                        <LanguageSelector />
                        <CurrencySelector />
                      </div>

                      {/* Shopping Cart Icon (Link to page) */}
                      <div className="shrink-0">
                        <CartIcon />
                      </div>

                      <DynamicHeaderAuth
                        initialAuth={initialAuth}
                        initialSessionContext={initialSessionContext}
                      />
                    </div>
                  </SmartHeader>
                  {children}
                  <SmartFooter>
                    <footer className="border-t border-zinc-200 dark:border-zinc-900 py-10 text-center md:text-left text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 mt-auto">
                      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
                        <div className="flex flex-col space-y-1">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                            {systemName}
                          </p>
                          <p>Colombo, Sri Lanka</p>
                          <p className="pt-4">
                            &copy; {new Date().getFullYear()} {systemName}. All rights reserved.
                          </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 font-medium">
                          <div className="flex flex-col space-y-2">
                            <span className="text-zinc-900 dark:text-zinc-100 font-bold mb-1 uppercase tracking-wider text-[10px]">
                              Legal
                            </span>
                            <Link
                              href="/privacy"
                              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                              Privacy Policy
                            </Link>
                            <Link
                              href="/cookie"
                              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                              Cookie Policy
                            </Link>
                            <Link
                              href="/terms"
                              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                              Terms of Service
                            </Link>
                            <Link
                              href="/refund"
                              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                              Refund Policy
                            </Link>
                          </div>
                          <div className="flex flex-col space-y-2 mt-4 md:mt-0">
                            <span className="text-zinc-900 dark:text-zinc-100 font-bold mb-1 uppercase tracking-wider text-[10px]">
                              Support
                            </span>
                            <Link
                              href="/support"
                              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors font-medium text-indigo-600 dark:text-indigo-400"
                            >
                              Help Center &amp; FAQs
                            </Link>
                            <Link
                              href="/contact"
                              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                              Contact Us
                            </Link>
                          </div>
                        </div>
                      </div>
                    </footer>
                  </SmartFooter>
                  <LanguageSplash systemName={systemName} />
                  <CartMergeBanner />
                </CartProvider>
              </CurrencyProvider>
              <Toaster
                position="top-right"
                toastOptions={{ className: "text-xs font-semibold", duration: 4000 }}
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
