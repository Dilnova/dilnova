"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  sendMessageAction,
  sendAttachmentAction,
  markConversationReadAction,
  resolveConversationAction,
} from "../actions";
import ChatMessageBubble from "./ChatMessageBubble";
import ShippingQuoteCard from "./ShippingQuoteCard";
import type { ChatMessageItem, ConversationDetail } from "../types";
import { uploadToCloudinary } from "@/shared/media/cloudinary-upload";
import { formatMoney, DEFAULT_CURRENCY } from "@/shared/currency";
import {
  Send,
  Paperclip,
  Truck,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  conversationId: string;
  currentUserId?: string;
  currentUserRole?: "customer" | "vendor_admin" | "vendor_member";
  onClose?: () => void;
  titleOverride?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 404) {
    const error = new Error("Conversation not found") as Error & { status: number };
    error.status = 404;
    throw error;
  }
  if (!res.ok) {
    throw new Error("Failed to fetch messages");
  }
  return res.json();
};

const VENDOR_QUICK_REPLIES = [
  {
    label: "🚚 Order Dispatched",
    text: "Your order has been dispatched! Tracking details will be updated shortly.",
  },
  {
    label: "📦 Packing Order",
    text: "We are currently preparing and securely packing your items.",
  },
  { label: "🏢 Ready for Pickup", text: "Your order is ready for pickup at our branch counter." },
  {
    label: "🔍 Checking Stock",
    text: "We are checking our inventory stock for your request right now.",
  },
  { label: "👋 Welcome", text: "Thank you for reaching out! How can we help you with your order?" },
];

export default function ChatWindow({
  conversationId,
  currentUserId,
  currentUserRole = "customer",
  onClose,
  titleOverride,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isConversationDeleted, setIsConversationDeleted] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLength = useRef(0);

  // 1. Message sync via SWR (4s active polling, paused when tab is hidden/offline)
  const { data, mutate, isLoading } = useSWR<{
    conversation: ConversationDetail;
    messages: ChatMessageItem[];
  }>(isConversationDeleted ? null : `/api/chat/messages/${conversationId}`, fetcher, {
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    refreshInterval: isConversationDeleted ? 0 : 4000,
    onError: (err: { status?: number }) => {
      if (err?.status === 404) {
        setIsConversationDeleted(true);
        toast.error("This order conversation is no longer active.");
      }
    },
  });

  const conversation = data?.conversation;

  // Guarantee key uniqueness by filtering out any transient duplicate IDs
  const messages = React.useMemo(() => {
    const raw = data?.messages || [];
    const seen = new Set<string>();
    return raw.filter((msg) => {
      if (!msg?.id || seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [data?.messages]);

  // Internal scrolling without triggering parent window scroll
  const scrollToBottom = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      container.scrollTop = container.scrollHeight;
    }
    setShowScrollBottom(false);
  }, []);

  // Track container scroll position to show "scroll to bottom" button
  const handleContainerScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottom(distanceFromBottom > 100);
  };

  // 2. Mark as read on mount and when messages update
  useEffect(() => {
    if (conversationId && !isConversationDeleted) {
      markConversationReadAction({ conversationId }).catch(() => {});
    }
  }, [conversationId, messages.length, isConversationDeleted]);

  // 3. Intelligent auto-scrolling: only scroll down if near bottom or on initial load
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isFirstLoad = prevMessagesLength.current === 0 && messages.length > 0;
    const hasNewMessages = messages.length > prevMessagesLength.current;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const wasNearBottom = distanceFromBottom < 140;

    if (isFirstLoad) {
      container.scrollTop = container.scrollHeight;
    } else if (hasNewMessages) {
      if (wasNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else {
        setShowScrollBottom(true);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  // 4. Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const contentToSend = (textToSend || inputText).trim();
    if (!contentToSend || isSending) return;

    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsSending(true);

    try {
      const res = await sendMessageAction({
        conversationId,
        content: contentToSend,
        messageType: "text",
      });

      if (res?.data?.success && res.data.message) {
        const newMsg = res.data.message as ChatMessageItem;
        // Optimistic UI refresh with duplicate check
        mutate((prev) => {
          if (!prev) return prev;
          const existing = prev.messages || [];
          if (existing.some((m) => m.id === newMsg.id)) return prev;
          return {
            ...prev,
            messages: [...existing, newMsg],
          };
        }, false);
        setTimeout(() => scrollToBottom(true), 50);
      } else {
        toast.error(res?.serverError || "Failed to send message.");
        setInputText(contentToSend);
      }
    } catch {
      toast.error("Failed to deliver message.");
      setInputText(contentToSend);
    } finally {
      setIsSending(false);
    }
  };

  // 5. Handle attachment file selection & upload
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      const uploadRes = await uploadToCloudinary(file, { uploadKind: "chat" });

      if (!uploadRes.success || !uploadRes.publicUrl) {
        toast.error(uploadRes.error || "Failed to upload file to storage.");
        return;
      }

      const sendRes = await sendAttachmentAction({
        conversationId,
        attachmentUrl: uploadRes.publicUrl,
        attachmentName: file.name,
      });

      if (sendRes?.data?.success) {
        toast.success("Attachment sent!");
        mutate();
        setTimeout(() => scrollToBottom(true), 50);
      } else {
        toast.error(sendRes?.serverError || "Failed to send attachment.");
      }
    } catch {
      toast.error("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 6. Resolve conversation handler (Vendor only)
  const handleResolve = async () => {
    if (!confirm("Are you sure you want to mark this customer inquiry as resolved?")) return;

    setIsResolving(true);
    try {
      const res = await resolveConversationAction({ conversationId });
      if (res?.data?.success) {
        toast.success("Inquiry marked as resolved.");
        mutate();
      } else {
        toast.error(res?.serverError || "Failed to resolve conversation.");
      }
    } catch {
      toast.error("An error occurred.");
    } finally {
      setIsResolving(false);
    }
  };

  const isVendor = currentUserRole === "vendor_admin" || currentUserRole === "vendor_member";
  const isResolved = conversation?.status === "resolved";
  const orderCurrency = conversation?.orderCurrency || DEFAULT_CURRENCY;

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm relative">
      {/* ── Chat Header ── */}
      <div className="flex flex-col px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 -ml-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition lg:hidden"
                title="Back to conversations"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate font-mono">
                  {titleOverride || `Order #${conversation?.orderId?.slice(0, 8) || "..."}`}
                </h3>
                {conversation?.status && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      conversation.status === "open"
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {conversation.status.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {conversation?.customerName || "Customer"}
                </span>
                {conversation?.branchName && <span>• {conversation.branchName}</span>}
                {conversation?.orderTotalAmount != null && (
                  <span className="font-mono text-zinc-500">
                    • {formatMoney(conversation.orderTotalAmount, orderCurrency)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Order Info Toggle Button */}
            {conversation?.orderId && (
              <button
                type="button"
                onClick={() => setShowOrderDetails(!showOrderDetails)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  showOrderDetails
                    ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
                title="View order details"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Order Info</span>
              </button>
            )}

            {isVendor && !isResolved && (
              <button
                type="button"
                onClick={handleResolve}
                disabled={isResolving}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer"
                title="Mark inquiry as resolved"
              >
                {isResolving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Resolve</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => mutate()}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="Refresh messages"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Order Details Card */}
        {showOrderDetails && conversation?.orderId && (
          <div className="mt-3 p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in font-mono">
            <div className="space-y-0.5">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                Order #{conversation.orderId.slice(0, 8)}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Total:{" "}
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {formatMoney(conversation.orderTotalAmount ?? 0, orderCurrency)}
                </span>{" "}
                • Status:{" "}
                <span className="uppercase font-semibold">
                  {conversation.orderStatus || "Pending"}
                </span>
              </p>
            </div>
            <Link
              href={`/customer/invoice/${conversation.orderId}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-semibold transition"
            >
              <span>View Invoice</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* ── Deleted / Archived Notice ── */}
      {isConversationDeleted && (
        <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 p-3 text-xs flex items-center gap-2 border-b border-rose-200 dark:border-rose-900 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>This conversation has been closed or removed.</span>
        </div>
      )}

      {/* ── Messages Feed (Strictly Container Scrolled) ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <p className="text-xs font-mono">Loading conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-center px-4">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No messages yet
            </p>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Ask about order progress, express delivery options, or special instructions below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = currentUserId
              ? msg.senderUserId === currentUserId
              : msg.senderRole === currentUserRole;
            return <ChatMessageBubble key={msg.id} message={msg} isSelf={isSelf} />;
          })
        )}
      </div>

      {/* ── Floating Scroll to Bottom Button ── */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-28 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full shadow-lg text-xs font-bold transition-all animate-bounce cursor-pointer active:scale-95"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Scroll to bottom</span>
        </button>
      )}

      {/* ── Shipping Quote Composer Modal (Vendor only) ── */}
      {showQuoteForm && isVendor && (
        <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <ShippingQuoteCard
            conversationId={conversationId}
            defaultCurrency={orderCurrency}
            onSuccess={() => {
              setShowQuoteForm(false);
              mutate();
              setTimeout(() => scrollToBottom(true), 50);
            }}
            onCancel={() => setShowQuoteForm(false)}
          />
        </div>
      )}

      {/* ── Vendor Quick Replies Bar ── */}
      {isVendor && !isResolved && (
        <div className="px-3 pt-2 pb-1 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0 pl-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            Quick:
          </span>
          {VENDOR_QUICK_REPLIES.map((reply, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(reply.text);
                textareaRef.current?.focus();
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-zinc-700 dark:text-zinc-300 hover:text-purple-700 dark:hover:text-purple-300 border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-800 transition whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
            >
              {reply.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        {isResolved ? (
          <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/80 rounded-xl px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span>This inquiry is marked as resolved. Sending a message will reopen it.</span>
            <button
              onClick={() => handleSendMessage()}
              className="font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Reopen
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />

          {/* Attachment Button */}
          <button
            type="button"
            disabled={isUploading || isSending}
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
            title="Attach image or document"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          {/* Vendor: Shipping Quote Button */}
          {isVendor && (
            <button
              type="button"
              onClick={() => setShowQuoteForm(!showQuoteForm)}
              className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                showQuoteForm
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title="Send Shipping Fee Quote"
            >
              <Truck className="w-5 h-5" />
            </button>
          )}

          {/* Auto-expanding Textarea Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type a message (Shift+Enter for new line)..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isSending || isConversationDeleted}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none max-h-28 overflow-y-auto leading-relaxed block"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending || isConversationDeleted}
            className="p-2.5 text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            title="Send message (Enter)"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
