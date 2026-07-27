"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { getClientSessionContextAction } from "@/shared/auth/session.actions";
import HeaderNav from "@/shared/ui/HeaderNav";
import { OrganizationSwitcher } from "@clerk/nextjs";
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
  initialAuth,
  initialSessionContext,
}: {
  mobileExtra: React.ReactNode;
  initialAuth?: InitialAuthData;
  initialSessionContext?: SessionContextData;
}) {
  const clientAuth = useAuth();

  const userId = clientAuth.isLoaded
    ? clientAuth.userId
    : (initialAuth?.userId ?? clientAuth.userId);
  const orgId = clientAuth.isLoaded ? clientAuth.orgId : (initialAuth?.orgId ?? clientAuth.orgId);
  const orgRole = clientAuth.isLoaded
    ? clientAuth.orgRole
    : (initialAuth?.orgRole ?? clientAuth.orgRole);

  const { data } = useSessionContext(initialSessionContext);

  const links: { href: string; label: string; colorClass?: string }[] = [
    { href: "/vendors", label: "Vendors" },
    { href: "/products", label: "Products" },
    { href: "/contact", label: "Support" },
  ];

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
          organizationSwitcherTrigger: "dark:[&_*]:!text-zinc-50",
          organizationSwitcherPopoverActionButton__createOrganization: canCreateOrg
            ? "flex"
            : "hidden",
          organizationSwitcherPopoverCreateOrganization: canCreateOrg ? "flex" : "hidden",
        },
      }}
    />
  );
}
