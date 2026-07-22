import React from "react";

export interface SuperadminFormCardProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function SuperadminFormCard({
  title,
  icon,
  children,
  className = "",
}: SuperadminFormCardProps) {
  return (
    <div
      className={`bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm ${className}`}
    >
      {(title || icon) && (
        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-4">
          {icon && <span>{icon}</span>}
          {title && <span>{title}</span>}
        </h3>
      )}
      {children}
    </div>
  );
}
