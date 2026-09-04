"use client";

import React from "react";
import Image from "next/image";
import type { ChatMessageItem, ShippingQuoteMetadata } from "../types";
import { Truck, FileText, Download, Check, CheckCheck } from "lucide-react";
import { formatMoney, DEFAULT_CURRENCY } from "@/shared/currency";

interface ChatMessageBubbleProps {
  message: ChatMessageItem;
  isSelf: boolean;
}

function formatChatTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export default function ChatMessageBubble({ message, isSelf }: ChatMessageBubbleProps) {
  const isSystem = message.messageType === "system";
  const isShippingQuote = message.messageType === "shipping_quote";
  const isAttachment = message.messageType === "attachment";

  const formattedTime = formatChatTime(message.createdAt);

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 rounded-full border border-zinc-200 dark:border-zinc-700/50 shadow-2xs font-mono">
          ℹ️ {message.content}
        </div>
      </div>
    );
  }

  const roleLabel =
    message.senderRole === "vendor_admin"
      ? "Store Admin"
      : message.senderRole === "vendor_member"
        ? "Branch Staff"
        : "Customer";

  const isImageAttachment =
    isAttachment &&
    message.attachmentUrl &&
    /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(message.attachmentUrl);

  const shippingMeta = isShippingQuote ? (message.metadata as ShippingQuoteMetadata) : null;

  return (
    <div
      className={`flex flex-col mb-4 ${
        isSelf ? "items-end ml-auto" : "items-start mr-auto"
      } max-w-[85%] sm:max-w-[75%]`}
    >
      <div className="flex items-center gap-1.5 mb-1 px-1">
        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          {message.senderName}
        </span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
            message.senderRole === "customer"
              ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
          }`}
        >
          {roleLabel}
        </span>
      </div>

      <div
        className={`rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
          isSelf
            ? "bg-purple-600 text-white rounded-br-xs"
            : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60 rounded-bl-xs"
        }`}
      >
        {/* Regular Text Message */}
        {!isShippingQuote && !isAttachment && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        )}

        {/* Structured Shipping Quote Card */}
        {isShippingQuote && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs pb-1 border-b border-white/20 dark:border-zinc-700">
              <Truck className="w-4 h-4" />
              <span>Official Shipping Quote</span>
            </div>
            {shippingMeta && (
              <div
                className={`p-3 rounded-xl ${
                  isSelf
                    ? "bg-purple-700/80 text-white border border-purple-500/40"
                    : "bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-semibold opacity-90">Shipping Fee:</span>
                  <span className="text-base font-extrabold font-mono text-emerald-400 dark:text-emerald-300">
                    {formatMoney(shippingMeta.fee, shippingMeta.currency || DEFAULT_CURRENCY)}
                  </span>
                </div>
                {shippingMeta.carrier && (
                  <div className="text-xs flex justify-between opacity-90">
                    <span>Carrier:</span>
                    <span className="font-semibold">{shippingMeta.carrier}</span>
                  </div>
                )}
                {shippingMeta.zone && (
                  <div className="text-xs flex justify-between opacity-90">
                    <span>Zone:</span>
                    <span className="font-semibold">{shippingMeta.zone}</span>
                  </div>
                )}
                {shippingMeta.estimatedDays && (
                  <div className="text-xs flex justify-between opacity-90">
                    <span>Est. Delivery:</span>
                    <span className="font-semibold">
                      {shippingMeta.estimatedDays} business days
                    </span>
                  </div>
                )}
                {shippingMeta.notes && (
                  <div className="mt-2 text-xs pt-1.5 border-t border-white/10 dark:border-zinc-800 italic opacity-95">
                    &quot;{shippingMeta.notes}&quot;
                  </div>
                )}
              </div>
            )}
            <p className="text-xs opacity-90">{message.content}</p>
          </div>
        )}

        {/* Attachment Message */}
        {isAttachment && message.attachmentUrl && (
          <div className="space-y-2">
            {isImageAttachment ? (
              <div className="relative rounded-xl overflow-hidden border border-white/20 dark:border-zinc-700 max-w-sm">
                <Image
                  src={message.attachmentUrl}
                  alt={message.attachmentName || "Attachment"}
                  width={400}
                  height={300}
                  className="object-cover w-full max-h-64 cursor-pointer hover:opacity-95 transition"
                  onClick={() => window.open(message.attachmentUrl || "", "_blank")}
                />
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                  isSelf
                    ? "bg-purple-700/60 border-purple-400/40 text-white"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                }`}
              >
                <FileText className="w-6 h-6 shrink-0 text-purple-300 dark:text-purple-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">
                    {message.attachmentName || "Document"}
                  </p>
                  <p className="text-[10px] opacity-75">Click to view/download</p>
                </div>
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={message.attachmentName}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition"
                  title="Download attachment"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
            {message.content && message.content !== `Attached file: ${message.attachmentName}` && (
              <p className="text-xs whitespace-pre-wrap mt-1">{message.content}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-1 px-1">
        <span
          className="text-[10px] text-zinc-600 dark:text-zinc-300 font-mono"
          suppressHydrationWarning
        >
          {formattedTime}
        </span>
        {isSelf && (
          <span
            className="text-zinc-600 dark:text-zinc-300"
            title={message.isRead ? "Read" : "Sent"}
          >
            {message.isRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
