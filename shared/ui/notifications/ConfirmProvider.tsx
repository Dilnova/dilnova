"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmContextType {
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirmAction = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) resolveRef.current(true);
    setOptions(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) resolveRef.current(false);
    setOptions(null);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && options) {
        handleCancel();
      }
    },
    [options, handleCancel],
  );

  useEffect(() => {
    if (options) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [options, onKeyDown]);

  const confirmModal =
    options && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 overflow-hidden relative"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
            >
              <h2
                id="confirm-title"
                className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-2"
              >
                {options.title}
              </h2>
              <div id="confirm-message" className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                {options.message}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  {options.cancelText || "Cancel"}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors ${
                    options.variant === "danger"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : options.variant === "warning"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {options.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <ConfirmContext.Provider value={{ confirmAction }}>
      {children}
      {confirmModal}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
