'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';

const fetcher = async (url: string) => {
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to fetch presence');
  return response.json();
};

export function GlobalNotificationListener() {
  const { userId } = useAuth();
  const emptyCountRef = useRef(0);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    // Request Desktop Notification permission (Requires user gesture)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // We use a timeout to ensure sonner is mounted before triggering the toast
        setTimeout(() => {
          toast('Enable Desktop Notifications', {
            description: 'Get instantly alerted when a new order arrives, even if the tab is in the background.',
            action: {
              label: 'Enable',
              onClick: () => {
                Notification.requestPermission().then((perm) => {
                  if (perm === 'granted') {
                    toast.success('Desktop notifications enabled!');
                  }
                });
              }
            },
            duration: 10000,
          });
        }, 2000);
      }
    }
  }, [userId]);

  useSWR(userId ? '/api/vendor/presence' : null, fetcher, {
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    refreshInterval: (data) => {
      if (data?.notVendor) return 0; // Stop polling completely
      
      // Dynamic backoff
      if (emptyCountRef.current > 20) return 60000;
      if (emptyCountRef.current > 10) return 30000;
      return 15000; // Default fast poll
    },
    onSuccess: (data) => {
      if (data.notVendor) return;

      if (!data.notifications || data.notifications.length === 0) {
        emptyCountRef.current += 1;
        return;
      }

      // Reset backoff counter when we get notifications
      emptyCountRef.current = 0;

      const ackIds: string[] = [];

      for (const notification of data.notifications) {
        const notifId = notification.id;
        
        // Prevent duplicate toasts if a slow ack overlaps with a rapid refetch or StrictMode
        if (notifId) {
          if (seenIdsRef.current.has(notifId)) {
            ackIds.push(notifId); // Still ensure we ack it if it somehow got stuck
            continue;
          }
          seenIdsRef.current.add(notifId);
          ackIds.push(notifId);
        }

        const { orderId, customerName, total, fulfillmentLabel } = notification;
        const message = `New ${fulfillmentLabel} order from ${customerName} for ${total}`;
        
        // Toast Notification (In-App)
        toast.success(message, {
          description: `Order #${orderId}`,
          duration: 10000,
          action: {
            label: 'View Order',
            onClick: () => window.location.href = `/vendor?tab=inventory`,
          },
        });

        // Desktop Notification (OS-level)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const desktopNotif = new Notification('New Order Received!', {
            body: message,
            icon: '/favicon.ico', // Fallback icon
          });
          desktopNotif.onclick = () => {
            window.focus();
            window.location.href = `/vendor?tab=inventory`;
          };
        }
      }

      // Acknowledge notifications immediately using a plain fetch.
      // We do NOT use mutate() here because we don't want to trigger a redundant SWR 
      // fetch cycle just to confirm the deletion; the local queue is already processed.
      if (ackIds.length > 0) {
        fetch('/api/vendor/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ackIds }),
        }).catch(() => {
          // Ignore ack errors, the next SWR poll will retry due to the non-destructive peek
        });
      }
    }
  });

  return null;
}
