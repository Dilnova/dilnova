"use client";

import { useAuth, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import HeaderAuthButtons from "@/shared/ui/HeaderAuthButtons";
import useSWR from "swr";
import { getClientSessionContextAction } from "@/shared/auth/session.actions";
import HeaderNav from "@/shared/ui/HeaderNav";
import React from "react";

export type SessionContextData = {
  isSuperAdmin: boolean;
  canCreateOrg: boolean;
  billingActive: boolean;
} | null;

export type InitialAuthData = {
  userId: string | null;
  orgId: string | null;
  orgRole: string | null;
} | null;

export function useSessionContext(initialData?: SessionContextData) {
  const { isLoaded, isSignedIn } = useAuth();

  const { data, isLoading } = useSWR(
    isLoaded && isSignedIn ? "client-session-context" : null,
    () => getClientSessionContextAction(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      fallbackData: initialData ?? undefined,
    },
  );

  return {
    data: data ?? initialData ?? null,
    isLoading: (!isLoaded && !initialData) || (isSignedIn && isLoading && !data && !initialData),
  };
}

export function DynamicHeaderNav({
  mobileExtra,
  initialAuth: _initialAuth,
  initialSessionContext,
}: {
  mobileExtra: React.ReactNode;
  initialAuth?: InitialAuthData;
  initialSessionContext?: SessionContextData;
}) {
  const clientAuth = useAuth();

  const links: { href: string; label: string; colorClass?: string }[] = [
    { href: "/vendors", label: "Vendors" },
    { href: "/products", label: "Products" },
    { href: "/contact", label: "Support" },
  ];

  // Synchronize with clientAuth.isLoaded so role links and profile load together
  if (clientAuth.isLoaded) {
    const userId = clientAuth.userId;
    const orgId = clientAuth.orgId;
    const orgRole = clientAuth.orgRole;
    const data = initialSessionContext;

    if (orgId && orgRole === "org:admin") {
      links.push({
        href: "/vendor",
        label: "Dashboard",
        colorClass:
          "text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-semibold",
      });
    }

    if (orgId && (orgRole === "org:admin" || orgRole === "org:member")) {
      links.push({
        href: "/vendor/products/add",
        label: "Create",
        colorClass:
          "text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300",
      });
    }

    if (userId) {
      links.push({
        href: "/customer",
        label: "Account",
        colorClass:
          "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold",
      });
    }

    if (data?.billingActive && orgId && (orgRole === "org:admin" || orgRole === "org:member")) {
      links.push({
        href: "/vendor/billing",
        label: "POS Register",
        colorClass:
          "text-indigo-650 hover:text-indigo-850 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold",
      });
    }

    if (orgId && orgRole === "org:admin") {
      links.push({
        href: "/admin",
        label: "Admin",
        colorClass:
          "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold",
      });
    }

    if (data?.isSuperAdmin) {
      links.push({
        href: "/superadmin",
        label: "Superadmin",
        colorClass:
          "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-bold",
      });
    }
  }

  return <HeaderNav links={links} mobileExtra={mobileExtra} />;
}

export function DynamicOrganizationSwitcher({
  initialSessionContext,
}: {
  initialSessionContext?: SessionContextData;
}) {
  const { data } = useSessionContext(initialSessionContext);
  const canCreateOrg = data?.canCreateOrg ?? false;

  return (
    <OrganizationSwitcher
      afterCreateOrganizationUrl="/"
      afterSelectOrganizationUrl="/"
      afterLeaveOrganizationUrl="/"
      afterSelectPersonalUrl="/"
      hidePersonal={false}
      appearance={{
        elements: {
          organizationSwitcherTrigger:
            "dark:[&_*]:!text-zinc-50 max-w-[120px] sm:max-w-[180px] md:max-w-[240px] px-1.5 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors shrink min-w-0",
          organizationPreview: "max-w-full min-w-0 overflow-hidden flex items-center gap-1.5",
          organizationPreviewTextContainer:
            "max-w-[70px] sm:max-w-[135px] md:max-w-[180px] min-w-0 overflow-hidden truncate",
          organizationPreviewMainIdentifier:
            "truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-[70px] sm:max-w-[135px] md:max-w-[180px]",
          organizationPreviewSecondaryIdentifier:
            "truncate text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[70px] sm:max-w-[135px] md:max-w-[180px]",
          organizationSwitcherTriggerIcon: "shrink-0 ml-0.5 opacity-70",
          organizationSwitcherPopoverActionButton__createOrganization: canCreateOrg
            ? "flex"
            : "hidden",
          organizationSwitcherPopoverCreateOrganization: canCreateOrg ? "flex" : "hidden",
        },
      }}
    />
  );
}

export function DynamicHeaderAuth({
  initialAuth,
  initialSessionContext,
}: {
  initialAuth?: InitialAuthData;
  initialSessionContext?: SessionContextData;
}) {
  const clientAuth = useAuth();

  // 1. While Clerk JS SDK is initializing on the client side:
  if (!clientAuth.isLoaded) {
    const isInitiallySignedIn = !!initialAuth?.userId;

    if (isInitiallySignedIn) {
      return (
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 shrink">
          {/* Org Switcher Skeleton Placeholder */}
          <div className="h-8 w-20 sm:w-28 rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse shrink min-w-0" />
          {/* User Profile Avatar Skeleton Placeholder */}
          <div className="h-8 w-8 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse shrink-0" />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 w-14 sm:w-16 rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
        <div className="h-8.5 w-16 sm:w-20 rounded-lg bg-purple-200/60 dark:bg-purple-900/40 animate-pulse" />
      </div>
    );
  }

  // 2. Once Clerk JS SDK is fully initialized:
  if (clientAuth.userId) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 shrink">
        <div className="min-w-0 shrink">
          <DynamicOrganizationSwitcher initialSessionContext={initialSessionContext} />
        </div>
        <div className="shrink-0">
          <UserButton />
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <HeaderAuthButtons />
    </div>
  );
}
