/**
 * useTerminalWebSocket Hook
 *
 * React hook for managing WebSocket connection to VibeTunnel terminal.
 * Provides connection management, input sending, output receiving, and status tracking.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ConnectionStatus, KeyboardInputEvent } from '@/web/shared/types/console';
import { ConnectionManager, type ConnectionManagerConfig } from './ConnectionManager';

export interface UseTerminalWebSocketOptions {
  /**
   * Session ID to connect to
   */
  sessionId: string;

  /**
   * Base WebSocket URL (e.g., "ws://localhost:3000")
   * Defaults to current host
   */
  baseUrl?: string;

  /**
   * Callback when output is received
   */
  onOutput: (data: string) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;

  /**
   * Auto-connect on mount (default: true)
   */
  autoConnect?: boolean;

  /**
   * Maximum retry time in milliseconds (default: 5 minutes)
   */
  maxRetryTime?: number;

  /**
   * Maximum input queue size in bytes (default: 1KB)
   */
  maxInputQueueSize?: number;
}

export interface UseTerminalWebSocketReturn {
  /**
   * Current connection status
   */
  status: ConnectionStatus;

  /**
   * Send input to terminal
   */
  sendInput: (input: string | KeyboardInputEvent) => void;

  /**
   * Manually connect to WebSocket
   */
  connect: () => Promise<void>;

  /**
   * Manually disconnect from WebSocket
   */
  disconnect: () => void;

  /**
   * Check if currently connected
   */
  isConnected: boolean;
}

/**
 * Hook for managing WebSocket connection to terminal
 */
export function useTerminalWebSocket(
  options: UseTerminalWebSocketOptions
): UseTerminalWebSocketReturn {
  const {
    sessionId,
    baseUrl,
    onOutput,
    onError,
    autoConnect = true,
    maxRetryTime,
    maxInputQueueSize,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
  });

  const connectionManagerRef = useRef<ConnectionManager | null>(null);

  // Derive WebSocket base URL from window.location if not provided
  // useMemo prevents recalculation on every render, which would cause infinite loop
  const wsBaseUrl = useMemo(() => {
    if (baseUrl) return baseUrl;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }, [baseUrl]);

  // Initialize ConnectionManager
  useEffect(() => {
    const config: ConnectionManagerConfig = {
      sessionId,
      baseUrl: wsBaseUrl,
      onOutput,
      onError,
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      maxRetryTime,
      maxInputQueueSize,
    };

    const manager = new ConnectionManager(config);
    connectionManagerRef.current = manager;

    // Auto-connect if enabled
    if (autoConnect) {
      void manager.connect();
    }

    // Cleanup on unmount
    return () => {
      manager.disconnect();
      connectionManagerRef.current = null;
    };
    // NOTE: onOutput and onError are intentionally excluded from dependencies
    // They are callback functions that should capture the current closure,
    // not trigger re-initialization when they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, wsBaseUrl, autoConnect, maxRetryTime, maxInputQueueSize]);

  // Send input callback
  const sendInput = useCallback((input: string | KeyboardInputEvent) => {
    connectionManagerRef.current?.sendInput(input);
  }, []);

  // Connect callback
  const connect = useCallback(async () => {
    await connectionManagerRef.current?.connect();
  }, []);

  // Disconnect callback
  const disconnect = useCallback(() => {
    connectionManagerRef.current?.disconnect();
  }, []);

  // Derived isConnected state
  const isConnected = status.connected && !status.reconnecting;

  return {
    status,
    sendInput,
    connect,
    disconnect,
    isConnected,
  };
}
