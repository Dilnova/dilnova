'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { usePOSBilling } from '../hooks/use-pos-billing';
import type { VendorBillingRegisterData } from '@/features/billing/types';
import { toast } from 'sonner';

type POSBillingContextType = ReturnType<typeof usePOSBilling> & {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isMobileCartOpen: boolean;
  setIsMobileCartOpen: (open: boolean) => void;
  systemName: string;
  orgName: string;
  isAdmin: boolean;
};

const POSBillingContext = createContext<POSBillingContextType | null>(null);

export function POSBillingProvider({
  initialData,
  systemName = 'Dilnova',
  orgName,
  isAdmin = false,
  children,
}: {
  initialData: VendorBillingRegisterData;
  systemName?: string;
  orgName?: string;
  isAdmin?: boolean;
  children: ReactNode;
}) {
  const posState = usePOSBilling(initialData);

  // Fullscreen Mode State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile Checkout Drawer State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const {
    data: { branches },
    setSelectedBranchId,
    selectedBranchId
  } = posState;

  useEffect(() => {
    if (branches && branches.length > 0) {
      const defaultBranch = branches.find((b) => b.isDefault) || branches[0];
      requestAnimationFrame(() => {
        if (!selectedBranchId) {
          setSelectedBranchId(defaultBranch.id);
        }
      });
    }
  }, [branches, setSelectedBranchId, selectedBranchId]);

  // Fullscreen toggle event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.error('Fullscreen mode not supported on this device/browser.');
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const value: POSBillingContextType = {
    ...posState,
    isFullscreen,
    toggleFullscreen,
    isMobileCartOpen,
    setIsMobileCartOpen,
    systemName,
    orgName: orgName || 'POS Register',
    isAdmin,
  };

  return <POSBillingContext.Provider value={value}>{children}</POSBillingContext.Provider>;
}

export function usePOSContext() {
  const context = useContext(POSBillingContext);
  if (!context) {
    throw new Error('usePOSContext must be used within a POSBillingProvider');
  }
  return context;
}
