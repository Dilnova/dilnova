'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function GlobalNotificationListener({ 
  userId, 
}: { 
  userId?: string | null;
}) {
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

    let interval: NodeJS.Timeout;

    const pingPresenceAndPollNotifications = async () => {
      try {
        const response = await fetch('/api/vendor/presence', { method: 'POST' });
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.notVendor) {
          if (interval) clearInterval(interval);
          return;
        }

        if (data.notifications && Array.isArray(data.notifications)) {
          for (const notification of data.notifications) {
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
        }
      } catch (error) {
        // Ignore fetch errors during polling
      }
    };
    
    // Ping immediately, then every 15 seconds (reduced for faster notifications)
    pingPresenceAndPollNotifications();
    interval = setInterval(pingPresenceAndPollNotifications, 15000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userId]);

  return null;
}
