"use client";

import SuperadminFormCard from "../../ui/SuperadminFormCard";

interface StorefrontLayoutsSectionProps {
  hardwareCustomEnabledInput: boolean;
  setHardwareCustomEnabledInput: (val: boolean) => void;
  nurseryCustomEnabledInput: boolean;
  setNurseryCustomEnabledInput: (val: boolean) => void;
  techCustomEnabledInput: boolean;
  setTechCustomEnabledInput: (val: boolean) => void;
  servicesCustomEnabledInput: boolean;
  setServicesCustomEnabledInput: (val: boolean) => void;
}

export default function StorefrontLayoutsSection({
  hardwareCustomEnabledInput,
  setHardwareCustomEnabledInput,
  nurseryCustomEnabledInput,
  setNurseryCustomEnabledInput,
  techCustomEnabledInput,
  setTechCustomEnabledInput,
  servicesCustomEnabledInput,
  setServicesCustomEnabledInput,
}: StorefrontLayoutsSectionProps) {
  return (
    <SuperadminFormCard title="Custom Storefront Layouts" icon="🎨" className="space-y-4">
      {/* Hardware */}
      <div className="flex items-center justify-between py-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor="toggle-hardware"
              className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Dilstar Hardware Storefront
            </label>
            {hardwareCustomEnabledInput ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Custom Layout Active
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Standard View
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-400">
            Toggle custom dashboard storefront layout for Dilstar Hardware
          </p>
        </div>
        <button
          id="toggle-hardware"
          type="button"
          onClick={() => setHardwareCustomEnabledInput(!hardwareCustomEnabledInput)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
            hardwareCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
          aria-pressed={hardwareCustomEnabledInput}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              hardwareCustomEnabledInput ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Nursery */}
      <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor="toggle-nursery"
              className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Dilstar Nursery Storefront
            </label>
            {nurseryCustomEnabledInput ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Custom Layout Active
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Standard View
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-400">
            Toggle custom dashboard storefront layout for Dilstar Nursery
          </p>
        </div>
        <button
          id="toggle-nursery"
          type="button"
          onClick={() => setNurseryCustomEnabledInput(!nurseryCustomEnabledInput)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
            nurseryCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
          aria-pressed={nurseryCustomEnabledInput}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              nurseryCustomEnabledInput ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Tech Shop */}
      <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor="toggle-tech"
              className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Dilstar Tech Shop Storefront
            </label>
            {techCustomEnabledInput ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Custom Layout Active
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Standard View
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-400">
            Toggle custom dashboard storefront layout for Dilstar Tech Shop
          </p>
        </div>
        <button
          id="toggle-tech"
          type="button"
          onClick={() => setTechCustomEnabledInput(!techCustomEnabledInput)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
            techCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
          aria-pressed={techCustomEnabledInput}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              techCustomEnabledInput ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Services */}
      <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor="toggle-services"
              className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Dilstar Services Storefront
            </label>
            {servicesCustomEnabledInput ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Custom Layout Active
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Standard View
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-400">
            Toggle custom dashboard storefront layout for Dilstar Services
          </p>
        </div>
        <button
          id="toggle-services"
          type="button"
          onClick={() => setServicesCustomEnabledInput(!servicesCustomEnabledInput)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
            servicesCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
          aria-pressed={servicesCustomEnabledInput}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              servicesCustomEnabledInput ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </SuperadminFormCard>
  );
}
