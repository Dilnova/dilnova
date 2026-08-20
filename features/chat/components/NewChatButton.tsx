"use client";

import React, { useState } from "react";
import { createConversationAction } from "../actions";
import ChatDrawer from "./ChatDrawer";
import UnreadBadge from "./UnreadBadge";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NewChatButtonProps {
  orderId: string;
  initialUnreadCount?: number;
  className?: string;
}

export default function NewChatButton({
  orderId,
  initialUnreadCount = 0,
  className = "",
}: NewChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const handleOpenChat = async () => {
    if (conversationId) {
      setIsOpen(true);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const res = await createConversationAction({ orderId });
      if (res?.data?.success && res.data.conversationId) {
        setConversationId(res.data.conversationId);
        setIsOpen(true);
        setUnreadCount(0);
      } else {
        toast.error(res?.serverError || "Could not start chat with vendor.");
      }
    } catch {
      toast.error("Failed to connect to store chat.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenChat}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50 ${className}`}
        title="Message vendor about shipping or order status"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5" />
        )}
        <span>Message Vendor</span>
        <UnreadBadge count={unreadCount} />
      </button>

      <ChatDrawer
        isOpen={isOpen}
        conversationId={conversationId}
        orderId={orderId}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
