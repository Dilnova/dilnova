"use client";

import React, { useState } from "react";
import type { ConversationDetail } from "../types";
import ChatWindow from "./ChatWindow";
import UnreadBadge from "./UnreadBadge";
import { Search, MessageSquare, Clock, Building2, User } from "lucide-react";

interface ConversationListProps {
  initialConversations: ConversationDetail[];
  currentUserId?: string;
  currentUserRole?: "vendor_admin" | "vendor_member";
}

export default function ConversationList({
  initialConversations,
  currentUserId,
  currentUserRole = "vendor_admin",
}: ConversationListProps) {
  const [conversations] = useState<ConversationDetail[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");

  const filteredConversations = conversations.filter((conv) => {
    if (statusFilter !== "all" && conv.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOrder = conv.orderId.toLowerCase().includes(q);
      const matchCustomer = conv.customerName?.toLowerCase().includes(q);
      const matchEmail = conv.customerEmail?.toLowerCase().includes(q);
      const matchBranch = conv.branchName?.toLowerCase().includes(q);
      return matchOrder || matchCustomer || matchEmail || matchBranch;
    }
    return true;
  });

  const selectedConv = conversations.find((c) => c.id === selectedConversationId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px] bg-white dark:bg-zinc-900/60 p-4 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      {/* ── Left Column: Conversation Sidebar ── */}
      <div
        className={`lg:col-span-5 flex flex-col space-y-4 ${
          selectedConversationId ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header & Status Filter */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              <span>Customer Inquiries</span>
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              {filteredConversations.length}{" "}
              {filteredConversations.length === 1 ? "thread" : "threads"}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                statusFilter === "open"
                  ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                statusFilter === "resolved"
                  ? "bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[520px]">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-xs">No conversations match your criteria.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConversationId;
              const formattedDate = new Date(conv.lastMessageAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-xs"
                      : "bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        #{conv.orderId.slice(0, 8)}
                      </span>
                      <UnreadBadge count={conv.unreadByVendor} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          conv.status === "open"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {conv.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate font-medium">{conv.customerName || "Customer"}</span>
                  </div>

                  {conv.branchName && (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">{conv.branchName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formattedDate}
                    </span>
                    {conv.orderTotalAmount !== undefined && (
                      <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-400">
                        {conv.orderCurrency} {(conv.orderTotalAmount / 100).toFixed(2)}
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
        className={`lg:col-span-7 h-[650px] ${selectedConversationId ? "flex flex-col" : "hidden lg:flex"}`}
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
          <div className="flex flex-col items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 text-center p-8">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30 text-purple-600" />
            <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Select a Conversation
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Choose an inquiry from the list on the left to message the customer, provide shipping
              quotes, or resolve questions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
