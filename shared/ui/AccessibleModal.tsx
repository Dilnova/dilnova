'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string; // For the inner container
  backdropClassName?: string;
}

export function AccessibleModal({ 
  isOpen, 
  onClose, 
  children, 
  className = "bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md",
  backdropClassName = "flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
      }
      
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    document.addEventListener('keydown', handleKeyDown);
    
    // Auto-focus the modal container so Escape works immediately without tabbing
    setTimeout(() => {
      modalRef.current?.focus();
    }, 10);
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 ${backdropClassName}`} 
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`outline-none ${className}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
