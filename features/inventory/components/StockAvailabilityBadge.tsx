import {
  getBadgeToneClasses,
  type StockAvailabilityTone,
} from "@/features/inventory/availability.shared";

interface StockAvailabilityBadgeProps {
  label: string;
  tone?: StockAvailabilityTone;
  className?: string;
}

export default function StockAvailabilityBadge({
  label,
  tone = "zinc" as StockAvailabilityTone,
  className = "",
}: StockAvailabilityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${getBadgeToneClasses(tone)} ${className}`}
    >
      {label}
    </span>
  );
}
