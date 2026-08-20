"use client";

import React from "react";

interface UnreadBadgeProps {
  count?: number;
  className?: string;
}

export default function UnreadBadge({ count = 0, className = "" }: UnreadBadgeProps) {
  if (!count || count <= 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold font-mono text-white bg-rose-600 rounded-full shadow-xs min-w-[18px] h-[18px] animate-pulse ${className}`}
      title={`${count} unread message${count > 1 ? "s" : ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
