"use client";

import Link from "next/link";

interface SuperAdminNavigationProps {
  activeTab: string;
  vendorIssuesCount: number;
  pendingContactsCount: number;
}

export default function SuperAdminNavigation({
  activeTab,
  vendorIssuesCount,
  pendingContactsCount,
}: SuperAdminNavigationProps) {
  const tabConfig = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "categories", label: "Categories", icon: "🏷️" },
    { key: "products", label: "Products", icon: "📦" },
    { key: "inventory", label: "Inventory", icon: "🏭" },
    { key: "licenses", label: "Licenses & Limits", icon: "👑" },
    { key: "vendor-issues", label: "Vendor Issues", icon: "🏢", badge: vendorIssuesCount },
    { key: "pricing", label: "Pricing Plans", icon: "💳" },
    { key: "contacts", label: "Contact Requests", icon: "📨", badge: pendingContactsCount },
    { key: "settings", label: "Settings", icon: "⚙️" },
    { key: "compliance", label: "Compliance (GDPR)", icon: "🛡️" },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      {tabConfig.map((tab) => (
        <Link
          key={tab.key}
          href={`?tab=${tab.key}`}
          scroll={false}
          className={`flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
            activeTab === tab.key
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          <span className="text-sm">{tab.icon}</span>
          {tab.label}
          {"badge" in tab && typeof tab.badge === "number" && tab.badge > 0 && (
            <span className="ml-1 inline-flex min-w-[1.25rem] h-5 px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black">
              {tab.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
