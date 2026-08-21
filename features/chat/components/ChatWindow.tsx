"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
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
import {
  Send,
  Paperclip,
  Truck,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const messages = data?.messages || [];

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  // 2. Mark as read on mount and when messages update
  useEffect(() => {
    if (conversationId && !isConversationDeleted) {
      markConversationReadAction({ conversationId }).catch(() => {});
    }
  }, [conversationId, messages.length, isConversationDeleted]);

  // 3. Auto-scroll on initial load and message count change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages.length, scrollToBottom]);

  // 5. Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const contentToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await sendMessageAction({
        conversationId,
        content: contentToSend,
        messageType: "text",
      });

      if (res?.data?.success && res.data.message) {
        // Optimistic UI refresh
        mutate(
          (prev) => ({
            conversation: prev?.conversation || ({} as ConversationDetail),
            messages: [...(prev?.messages || []), res.data!.message as ChatMessageItem],
          }),
          false,
        );
        scrollToBottom();
      } else {
        toast.error(res?.serverError || "Failed to send message.");
        setInputText(contentToSend); // Restore
      }
    } catch {
      toast.error("Failed to deliver message.");
      setInputText(contentToSend);
    } finally {
      setIsSending(false);
    }
  };

  // 6. Handle attachment file selection & upload
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
        scrollToBottom();
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

  // 7. Resolve conversation handler (Vendor only)
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

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* ── Chat Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="Close chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate font-mono">
                {titleOverride || `Order #${conversation?.orderId?.slice(0, 8) || "..."}`}
              </h3>
              {conversation?.status && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    conversation.status === "open"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {conversation.status.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {isVendor
                ? `Customer: ${conversation?.customerName || "Verified Buyer"}`
                : `Order Assistance & Shipping Help`}
              {conversation?.branchName && ` • Branch: ${conversation.branchName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                <CheckCircle2 className="w-3 h-3" />
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

      {/* ── Deleted / Archived Notice ── */}
      {isConversationDeleted && (
        <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 p-3 text-xs flex items-center gap-2 border-b border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>This conversation has been closed or removed.</span>
        </div>
      )}

      {/* ── Messages Feed ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
              Ask about order progress, express shipping rates, or delivery instructions below.
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
        <div ref={messagesEndRef} />
      </div>

      {/* ── Shipping Quote Composer Modal (Vendor only) ── */}
      {showQuoteForm && isVendor && (
        <div className="px-4">
          <ShippingQuoteCard
            conversationId={conversationId}
            defaultCurrency={conversation?.orderCurrency || "LKR"}
            onSuccess={() => {
              setShowQuoteForm(false);
              mutate();
              scrollToBottom();
            }}
            onCancel={() => setShowQuoteForm(false)}
          />
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        {isResolved ? (
          <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span>This inquiry is marked as resolved. New messages will re-open the thread.</span>
            <button
              onClick={() => handleSendMessage()}
              className="font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              Reopen
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
            className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer disabled:opacity-50"
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
              className={`p-2 rounded-xl transition cursor-pointer ${
                showQuoteForm
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title="Send Shipping Fee Quote"
            >
              <Truck className="w-5 h-5" />
            </button>
          )}

          {/* Message Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message to the store..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending || isConversationDeleted}
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isSending || isConversationDeleted}
            className="p-2.5 text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center"
            title="Send message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
