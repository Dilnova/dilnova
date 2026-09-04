"use client";

import React, { useState } from "react";
import useSWR from "swr";
import type { ConversationDetail } from "../types";
import ChatWindow from "./ChatWindow";
import UnreadBadge from "./UnreadBadge";
import { formatMoney, DEFAULT_CURRENCY } from "@/shared/currency";
import { Search, MessageSquare, Clock, Filter } from "lucide-react";

interface ConversationListProps {
  initialConversations: ConversationDetail[];
  currentUserId?: string;
  currentUserRole?: "vendor_admin" | "vendor_member";
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
};

function formatChatDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const day = d.getDate();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
}

export default function ConversationList({
  initialConversations,
  currentUserId,
  currentUserRole = "vendor_admin",
}: ConversationListProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "open" | "resolved">("all");

  // 1. Live SWR sync with fallback to SSR data
  const { data } = useSWR<{
    conversations: ConversationDetail[];
    totalCount: number;
  }>("/api/chat/conversations", fetcher, {
    fallbackData: {
      conversations: initialConversations,
      totalCount: initialConversations.length,
    },
    refreshInterval: 4000,
    revalidateOnFocus: true,
  });

  const conversations = data?.conversations || initialConversations;

  // 2. Filter & Search
  const filteredConversations = conversations.filter((conv) => {
    if (statusFilter === "unread" && (conv.unreadByVendor ?? 0) <= 0) return false;
    if (statusFilter === "open" && conv.status !== "open") return false;
    if (statusFilter === "resolved" && conv.status !== "resolved") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOrder = conv.orderId.toLowerCase().includes(q);
      const matchCustomer = conv.customerName?.toLowerCase().includes(q);
      const matchEmail = conv.customerEmail?.toLowerCase().includes(q);
      const matchBranch = conv.branchName?.toLowerCase().includes(q);
      const matchSnippet = conv.lastMessageSnippet?.toLowerCase().includes(q);
      return matchOrder || matchCustomer || matchEmail || matchBranch || matchSnippet;
    }
    return true;
  });

  const uniqueConversations = React.useMemo(() => {
    const seen = new Set<string>();
    return filteredConversations.filter((conv) => {
      if (!conv?.id || seen.has(conv.id)) return false;
      seen.add(conv.id);
      return true;
    });
  }, [filteredConversations]);

  const selectedConv = uniqueConversations.find((c) => c.id === selectedConversationId);

  // Helper for customer avatar initials
  const getInitials = (name?: string) => {
    if (!name) return "C";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="h-[calc(100vh-13rem)] min-h-[580px] max-h-[820px] bg-white dark:bg-zinc-900/60 p-3 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 overflow-hidden">
      {/* ── Left Column: Conversation Sidebar ── */}
      <div
        className={`lg:col-span-5 h-full flex flex-col min-h-0 ${
          selectedConversationId ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header, Search & Filter Bar */}
        <div className="flex flex-col gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span>Customer Inquiries</span>
            </h2>
            <span className="text-[11px] font-mono font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              {filteredConversations.length}{" "}
              {filteredConversations.length === 1 ? "thread" : "threads"}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by order, customer, message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs bg-zinc-100/80 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition placeholder:text-zinc-400"
            />
          </div>

          {/* Status Tabs Switcher */}
          <div className="flex bg-zinc-100/90 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 py-1 rounded-lg transition text-center cursor-pointer text-[11px] ${
                statusFilter === "all"
                  ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("unread")}
              className={`flex-1 py-1 rounded-lg transition text-center cursor-pointer text-[11px] ${
                statusFilter === "unread"
                  ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`flex-1 py-1 rounded-lg transition text-center cursor-pointer text-[11px] ${
                statusFilter === "open"
                  ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`flex-1 py-1 rounded-lg transition text-center cursor-pointer text-[11px] ${
                statusFilter === "resolved"
                  ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Conversation List Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-3 min-h-0">
          {uniqueConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                <Filter className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No matching inquiries
              </p>
              <p className="text-[11px] text-zinc-400 max-w-xs mt-0.5">
                {searchQuery
                  ? "Try searching for a different keyword or order ID."
                  : "New customer messages will appear here in real time."}
              </p>
            </div>
          ) : (
            uniqueConversations.map((conv) => {
              const isSelected = conv.id === selectedConversationId;
              const hasUnread = (conv.unreadByVendor ?? 0) > 0;
              const orderCurrency = conv.orderCurrency || DEFAULT_CURRENCY;
              const formattedDate = formatChatDate(conv.lastMessageAt);

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-xs ring-1 ring-purple-400/20"
                      : "bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                        {getInitials(conv.customerName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs truncate ${hasUnread ? "font-black text-zinc-950 dark:text-white" : "font-bold text-zinc-900 dark:text-zinc-100"}`}
                          >
                            {conv.customerName || "Customer"}
                          </span>
                          <UnreadBadge count={conv.unreadByVendor} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                        #{conv.orderId.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                          conv.status === "open"
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {conv.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Message Snippet */}
                  <p
                    className={`text-[11px] line-clamp-1 pl-9 pr-1 ${hasUnread ? "font-bold text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}
                  >
                    {conv.lastMessageSnippet ? conv.lastMessageSnippet : "No messages yet"}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60 mt-0.5 pl-1">
                    <span className="flex items-center gap-1" suppressHydrationWarning>
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {formattedDate}
                    </span>
                    {conv.orderTotalAmount !== undefined && (
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {formatMoney(conv.orderTotalAmount, orderCurrency)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Column: Selected Chat Window ── */}
      <div
        className={`lg:col-span-7 h-full flex flex-col min-h-0 ${
          selectedConversationId ? "flex" : "hidden lg:flex"
        }`}
      >
        {selectedConversationId && selectedConv ? (
          <ChatWindow
            conversationId={selectedConversationId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onClose={() => setSelectedConversationId(null)}
            titleOverride={`Order #${selectedConv.orderId.slice(0, 8)} • ${selectedConv.customerName || "Customer"}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-zinc-50/80 dark:bg-zinc-950/80 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Select an Inquiry
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
              Pick a conversation thread from the left to assist customers with delivery tracking,
              shipping fee quotes, or special instructions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
