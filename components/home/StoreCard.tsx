import Link from "next/link";
import { Wrench, Leaf, Cpu, Users } from "lucide-react";

export type StoreType = "hardware" | "nursery" | "tech" | "services";

interface StoreCardProps {
  type: StoreType;
  title: string;
  category: string;
  description: string;
  href: string;
}

const themeMap = {
  hardware: {
    color: "amber",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/30",
    hover: "group-hover:border-amber-500/50",
    button:
      "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900",
    icon: Wrench,
  },
  nursery: {
    color: "emerald",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20 dark:border-emerald-500/30",
    hover: "group-hover:border-emerald-500/50",
    button:
      "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900",
    icon: Leaf,
  },
  tech: {
    color: "indigo",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20 dark:border-indigo-500/30",
    hover: "group-hover:border-indigo-500/50",
    button:
      "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900",
    icon: Cpu,
  },
  services: {
    color: "teal",
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/20 dark:border-teal-500/30",
    hover: "group-hover:border-teal-500/50",
    button:
      "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-900",
    icon: Users,
  },
};

export default function StoreCard({ type, title, category, description, href }: StoreCardProps) {
  const theme = themeMap[type];
  const Icon = theme.icon;

  return (
    <Link
      href={href}
      className={`group relative flex flex-col p-6 rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${theme.border} ${theme.hover} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-950`}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${theme.bg} ${theme.text}`}
        >
          {category}
        </span>
        <div className={`p-2 rounded-xl ${theme.bg} ${theme.text}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-grow space-y-2 mb-6">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-[inherit]">
          {title}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className={`text-xs font-semibold ${theme.text} group-hover:underline`}>
          Browse Store &rarr;
        </span>
      </div>
    </Link>
  );
}
