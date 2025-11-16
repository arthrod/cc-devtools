import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../stores/appStore';

/**
 * SSE event types from server
 */
interface SSEEvent {
  type: 'ping' | 'kanban_changed' | 'memory_changed' | 'plan_changed' | 'file_changed';
  data?: {
    message?: string;
    eventType?: string;
    path?: string;
    timestamp?: string;
  };
}

/**
 * SSE connection configuration
 */
const SSE_CONFIG = {
  INITIAL_RETRY_DELAY: 1000, // Start with 1 second
  MAX_RETRY_DELAY: 30000, // Max 30 seconds between retries
  MAX_RETRY_ATTEMPTS: 10, // Give up after 10 failed attempts
  BACKOFF_MULTIPLIER: 2, // Double the delay on each retry
};

/**
 * React hook for Server-Sent Events (SSE) real-time updates
 *
 * Establishes connection to /api/sse endpoint and listens for file change events.
 * When kanban files change, invalidates React Query cache to trigger refetch.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Configurable retry limits
 * - Connection state tracking
 */
export function useSSE(): void {
  const queryClient = useQueryClient();
  const setLiveMessage = useAppStore((state) => state.setLiveMessage);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const hasTokenRef = useRef(false);
  const queryClientRef = useRef(queryClient);
  const setLiveMessageRef = useRef(setLiveMessage);

  // Keep refs updated
  queryClientRef.current = queryClient;
  setLiveMessageRef.current = setLiveMessage;

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Get auth token for SSE connection
      // EventSource doesn't support custom headers, so we pass token as query param
      const token = localStorage.getItem('cc-devtools-auth-token');
      const sseUrl = token ? `/cc-api/sse?token=${encodeURIComponent(token)}` : '/cc-api/sse';

      // Create EventSource connection
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;

          // Reset retry count on successful message
          retryCountRef.current = 0;

          // Handle different event types
          if (data.type === 'kanban_changed') {
            // Invalidate all kanban-related queries to trigger refetch
            void queryClientRef.current.invalidateQueries({ queryKey: ['kanban'] });
            setLiveMessageRef.current('Kanban board updated');
          } else if (data.type === 'memory_changed') {
            // Invalidate all memory-related queries to trigger refetch
            void queryClientRef.current.invalidateQueries({ queryKey: ['memories'] });
            setLiveMessageRef.current('Memory updated');
          } else if (data.type === 'plan_changed') {
            // Invalidate all plan-related queries to trigger refetch
            void queryClientRef.current.invalidateQueries({ queryKey: ['plans'] });
            setLiveMessageRef.current('Plan updated');
          }
          // Ping and file_changed events are handled elsewhere or ignored
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      // Handle connection open
      eventSource.onopen = () => {
        retryCountRef.current = 0; // Reset retry count on successful connection
      };

      // Handle errors with exponential backoff
      eventSource.onerror = () => {
        // Close the failed connection
        eventSource.close();

        // Check if we've exceeded max retries
        if (retryCountRef.current >= SSE_CONFIG.MAX_RETRY_ATTEMPTS) {
          return;
        }

        // Calculate retry delay with exponential backoff
        const baseDelay = SSE_CONFIG.INITIAL_RETRY_DELAY;
        const exponentialDelay = baseDelay * Math.pow(SSE_CONFIG.BACKOFF_MULTIPLIER, retryCountRef.current);
        const retryDelay = Math.min(exponentialDelay, SSE_CONFIG.MAX_RETRY_DELAY);

        retryCountRef.current += 1;

        // Schedule reconnection
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, retryDelay);
      };
    } catch {
      // Connection failed - will retry via exponential backoff
    }
  }, []); // Empty deps - use refs for everything

  useEffect(() => {
    isMountedRef.current = true;

    // Check if user has auth token and connect if needed
    const checkAndConnect = (): void => {
      const hasToken = localStorage.getItem('cc-devtools-auth-token') !== null;

      // Connect if we have a token and haven't connected yet
      if (hasToken && !hasTokenRef.current) {
        hasTokenRef.current = true;
        connect();
      }
      // Disconnect if token was removed
      else if (!hasToken && hasTokenRef.current) {
        hasTokenRef.current = false;
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }
    };

    // Initial check
    checkAndConnect();

    // Listen for storage changes (token added/removed in other tabs)
    window.addEventListener('storage', checkAndConnect);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;

      window.removeEventListener('storage', checkAndConnect);

      // Clear any pending retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Close EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []); // Empty deps - connect is stable
}
