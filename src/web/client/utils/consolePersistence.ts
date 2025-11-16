/**
 * localStorage persistence utilities for console tabs
 *
 * Hybrid persistence strategy:
 * - Store tab metadata in localStorage for fast page loads
 * - Validate sessions against server on mount
 * - Clean up dead sessions automatically
 *
 * Single-user mode: all devices share the same localStorage key
 */

import type { ConsoleTab } from '../../shared/types/console.js';

/**
 * Single shared storage key for all devices
 * Enables cross-device session continuity
 */
const STORAGE_KEY = 'console_tabs';

/**
 * Save tabs to localStorage
 * @param tabs Array of console tabs to save
 */
export function saveTabsToStorage(tabs: ConsoleTab[]): void {
  try {
    const data = JSON.stringify(tabs);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    console.error('[ConsolePersistence] Failed to save tabs to localStorage:', error);
  }
}

/**
 * Load tabs from localStorage
 * @returns Array of saved tabs, or empty array if none found
 */
export function loadTabsFromStorage(): ConsoleTab[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    const tabs = JSON.parse(data) as ConsoleTab[];
    return tabs;
  } catch (error) {
    console.error('[ConsolePersistence] Failed to load tabs from localStorage:', error);
    return [];
  }
}

/**
 * Clear all saved tabs
 */
export function clearTabsFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[ConsolePersistence] Failed to clear tabs from localStorage:', error);
  }
}

/**
 * Listen for storage events from other tabs/devices
 * Useful for syncing tab state across multiple browser tabs or devices
 * @param callback Function to call when tabs are updated
 * @returns Cleanup function to remove event listener
 */
export function watchTabsInOtherTabs(
  callback: (tabs: ConsoleTab[]) => void
): () => void {
  const handleStorageEvent = (event: StorageEvent) => {
    // Only respond to changes to our specific key
    if (event.key !== STORAGE_KEY) {
      return;
    }

    // Parse the new value
    try {
      const newValue = event.newValue;
      if (newValue) {
        const tabs = JSON.parse(newValue) as ConsoleTab[];
        callback(tabs);
      } else {
        // Tabs were cleared
        callback([]);
      }
    } catch (error) {
      console.error('[ConsolePersistence] Failed to parse storage event:', error);
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageEvent);
  };
}
