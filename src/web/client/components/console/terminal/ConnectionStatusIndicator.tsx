/**
 * ConnectionStatusIndicator Component
 *
 * Visual indicator for WebSocket connection status with retry functionality.
 *
 * States:
 * - Connected (green): WebSocket connected and active
 * - Reconnecting (yellow): Attempting to reconnect with retry count
 * - Failed (red): Connection failed with manual retry button
 *
 * Behavior:
 * - Shows prominently for 2.5 seconds after connecting
 * - Auto-fades to very low opacity to avoid obscuring terminal content
 * - Restores full visibility on hover
 * - Always visible when reconnecting or failed
 *
 * Branding: Uses salmon color (#f16b5a) for interactive elements
 */

import { useEffect, useState } from 'react';
import type { ConnectionStatus } from '@/web/shared/types/console';

export interface ConnectionStatusIndicatorProps {
  /**
   * Current connection status from WebSocket manager
   */
  status: ConnectionStatus;

  /**
   * Callback when user clicks retry button
   */
  onRetry?: () => void;

  /**
   * Whether to show the indicator (default: always show)
   */
  visible?: boolean;

  /**
   * Position of indicator (default: top-right)
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * ConnectionStatusIndicator - Visual status badge for WebSocket connection
 */
export function ConnectionStatusIndicator({
  status,
  onRetry,
  visible = true,
  position = 'top-right',
}: ConnectionStatusIndicatorProps) {
  // State for auto-hide behavior
  const [isHovered, setIsHovered] = useState(false);
  const [shouldFade, setShouldFade] = useState(false);

  // Don't render if not visible
  if (!visible) return null;

  // Auto-hide effect: fade after 2.5 seconds when connected
  useEffect(() => {
    if (status.connected && !status.reconnecting) {
      // Reset fade state immediately when connecting
      setShouldFade(false);

      // Set timer to fade after 2.5 seconds
      const timer = setTimeout(() => {
        setShouldFade(true);
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      // Always visible when reconnecting or failed
      setShouldFade(false);
    }
  }, [status.connected, status.reconnecting]);

  // Determine status color and message
  const getStatusInfo = (): {
    color: string;
    dotColor: string;
    message: string;
    showRetry: boolean;
  } => {
    if (status.connected && !status.reconnecting) {
      return {
        color: 'text-green-600 dark:text-green-400',
        dotColor: 'bg-green-500',
        message: 'Connected',
        showRetry: false,
      };
    }

    if (status.reconnecting) {
      const retryText = status.retryCount ? ` (${status.retryCount})` : '';
      return {
        color: 'text-yellow-600 dark:text-yellow-400',
        dotColor: 'bg-yellow-500',
        message: `Reconnecting${retryText}`,
        showRetry: false,
      };
    }

    // Failed/disconnected
    return {
      color: 'text-red-600 dark:text-red-400',
      dotColor: 'bg-red-500',
      message: status.error ?? 'Disconnected',
      showRetry: true,
    };
  };

  const statusInfo = getStatusInfo();

  // Position classes
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  // Determine opacity based on state
  const shouldBeVisible = isHovered || !shouldFade;
  const opacityClass = shouldBeVisible ? 'opacity-100' : 'opacity-10';

  return (
    <div
      className={`absolute ${positionClasses[position]} z-10 flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm shadow-md backdrop-blur-sm transition-opacity duration-500 dark:bg-gray-800/20 ${opacityClass}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status dot */}
      <div className="relative flex h-2 w-2 items-center justify-center">
        {/* Animated pulse ring for reconnecting state */}
        {status.reconnecting && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${statusInfo.dotColor} opacity-75`}
          />
        )}
        {/* Solid dot */}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${statusInfo.dotColor}`} />
      </div>

      {/* Status message */}
      <span className={`font-medium ${statusInfo.color} opacity-70`}>{statusInfo.message}</span>

      {/* Retry button (only shown when failed) */}
      {statusInfo.showRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 rounded px-2 py-0.5 text-xs font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{
            backgroundColor: '#f16b5a',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e05a49';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f16b5a';
          }}
          aria-label="Retry connection"
        >
          Retry
        </button>
      )}
    </div>
  );
}
