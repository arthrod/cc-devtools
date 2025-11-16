import { useEffect, useState } from 'react';

/**
 * Hook that tracks the browser's online/offline status
 *
 * Returns true when the browser is online, false when offline.
 * Updates automatically when the connection status changes.
 *
 * Uses the Browser's Online/Offline API:
 * - navigator.onLine for initial status
 * - 'online' and 'offline' events for changes
 *
 * @returns boolean indicating if the browser is online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Initialize with current status
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    // Update state when going online
    const handleOnline = (): void => {
      setIsOnline(true);
    };

    // Update state when going offline
    const handleOffline = (): void => {
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
