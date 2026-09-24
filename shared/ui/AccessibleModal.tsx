"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string; // For the inner container
  backdropClassName?: string;
  /** ID of the element that labels the modal (e.g. heading ID) */
  ariaLabelledBy?: string;
  /** Accessible name for the dialog when no visible heading exists */
  ariaLabel?: string;
  /** ID of the element describing the dialog content */
  ariaDescribedBy?: string;
  /** Whether to restore focus to previous element on close (default: true) */
  returnFocus?: boolean;
  /** Specific element or ref to restore focus to instead of document.activeElement */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

export function AccessibleModal({
  isOpen,
  onClose,
  children,
  className = "bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md",
  backdropClassName = "flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm",
  ariaLabelledBy,
  ariaLabel,
  ariaDescribedBy,
  returnFocus = true,
  restoreFocusRef,
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Capture the currently active element when opening to restore focus on close
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        e.preventDefault();
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Auto-focus modal container once on open
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 10);

    const explicitRestoreTarget = restoreFocusRef?.current;

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the element that was focused before the modal opened
      if (returnFocus) {
        const elementToRestore = explicitRestoreTarget ?? previousFocusRef.current;
        if (elementToRestore && typeof elementToRestore.focus === "function") {
          const doFocus = () => {
            if (elementToRestore.isConnected !== false) {
              elementToRestore.focus();
            }
          };

          if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(doFocus);
          } else {
            doFocus();
          }
        }
      }
    };
  }, [isOpen, returnFocus, restoreFocusRef]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${backdropClassName}`}
      onClick={() => onCloseRef.current()}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={!ariaLabelledBy ? ariaLabel || "Dialog" : undefined}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`outline-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
