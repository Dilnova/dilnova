"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  color?: "purple" | "blue" | "pink" | "emerald" | "amber" | "red" | "sky";
  ariaLabel?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  color = "purple",
  ariaLabel,
}: ToggleSwitchProps) {
  const activeColor = {
    purple: "bg-purple-600",
    blue: "bg-blue-600",
    pink: "bg-pink-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-600",
    red: "bg-red-600",
    sky: "bg-sky-600",
  }[color];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
        checked ? activeColor : "bg-zinc-200 dark:bg-zinc-800"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
