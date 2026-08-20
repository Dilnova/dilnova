"use client";

import React, { useEffect } from "react";
import ChatWindow from "./ChatWindow";
import { X } from "lucide-react";

interface ChatDrawerProps {
  isOpen: boolean;
  conversationId: string | null;
  onClose: () => void;
  orderId?: string;
}

export default function ChatDrawer({ isOpen, conversationId, onClose, orderId }: ChatDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !conversationId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md sm:max-w-lg flex flex-col bg-white dark:bg-zinc-950 shadow-2xl relative">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-700 text-white shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div>
                <h3 className="text-sm font-bold font-mono">
                  {orderId ? `Order Assistance #${orderId.slice(0, 8)}` : "Order Inquiries & Help"}
                </h3>
                <p className="text-[11px] text-purple-200">Chat directly with the store branch</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-purple-600 transition"
              title="Close chat drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Embedded Chat Window */}
          <div className="flex-1 p-2 sm:p-3 overflow-hidden">
            <ChatWindow
              conversationId={conversationId}
              currentUserRole="customer"
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
