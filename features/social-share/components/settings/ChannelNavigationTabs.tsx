"use client";

import type { ActiveTab } from "./types";

interface ChannelTabItem {
  id: ActiveTab;
  label: string;
  icon: string;
  badge?: {
    text: string;
    className: string;
  };
  activeColor: string;
}

const CHANNEL_TABS: ChannelTabItem[] = [
  {
    id: "facebook_feed",
    label: "Facebook",
    icon: "📢",
    activeColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    activeColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "instagram_feed",
    label: "Instagram",
    icon: "📸",
    activeColor: "text-pink-600 dark:text-pink-400",
  },
  {
    id: "pinterest",
    label: "Pinterest Pins",
    icon: "📌",
    activeColor: "text-red-600 dark:text-red-400",
  },
  {
    id: "templates",
    label: "Post Templates",
    icon: "✏️",
    activeColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "meta_catalog",
    label: "Meta Catalog",
    icon: "🛍️",
    badge: {
      text: "Enterprise",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    },
    activeColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: "⚡",
    badge: {
      text: "Dev",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },
    activeColor: "text-amber-600 dark:text-amber-400",
  },
];

export interface ChannelNavigationTabsProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export function ChannelNavigationTabs({ activeTab, onSelectTab }: ChannelNavigationTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Social media and messaging channels"
      className="flex overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-900/80 p-1.5 rounded-2xl mb-8 border border-zinc-200/80 dark:border-zinc-800 max-w-4xl"
    >
      {CHANNEL_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              isActive
                ? `bg-white dark:bg-zinc-800 ${tab.activeColor} shadow-sm`
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ml-0.5 ${tab.badge.className}`}
              >
                {tab.badge.text}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ChannelNavigationTabs;
