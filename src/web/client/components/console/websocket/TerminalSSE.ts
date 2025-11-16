/**
 * TerminalSSE - Server-Sent Events handler for VibeTunnel terminal streams
 *
 * Connects to /api/sessions/:id/stream and receives asciinema cast format events.
 * This gives us full scrollback history by replaying the entire session from the start.
 *
 * Cast Format:
 * - Header: {"version": 2, "width": 80, "height": 24, ...}
 * - Output: [timestamp, "o", data] - terminal output
 * - Resize: [timestamp, "r", [cols, rows]] - terminal resize (ignored)
 * - Input: [timestamp, "i", data] - keyboard input (ignored, for recording only)
 * - Exit: ["exit", exitCode, sessionId] - session ended
 */

import type { ConnectionStatus } from '@/web/shared/types/console';

export interface TerminalSSEConfig {
  /**
   * Session ID to connect to
   */
  sessionId: string;

  /**
   * Base URL for API (e.g., "http://localhost:9100")
   * Defaults to current host
   */
  baseUrl?: string;

  /**
   * Callback when terminal output is received
   */
  onOutput: (data: string) => void;

  /**
   * Callback when connection status changes
   */
  onStatusChange?: (status: ConnectionStatus) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;

  /**
   * Callback when session exits
   */
  onSessionExit?: (exitCode: number) => void;
}

/**
 * TerminalSSE manages Server-Sent Events connection for terminal output
 */
export class TerminalSSE {
  private config: TerminalSSEConfig;
  private eventSource: EventSource | null = null;
  private status: ConnectionStatus;
  private outputBuffer = '';
  private batchTimeout: number | null = null;
  private readonly batchDelay = 16; // ~60fps for smooth streaming

  constructor(config: TerminalSSEConfig) {
    this.config = config;
    this.status = {
      connected: false,
      reconnecting: false,
    };
  }

  /**
   * Connect to SSE stream
   * Returns a Promise that resolves when connection is established or rejects on error
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.updateStatus({
          connected: false,
          reconnecting: true,
        });

        // Build SSE URL (always use HTTP/HTTPS, never ws://)
        const baseUrl = this.config.baseUrl ?? (() => {
          // EventSource always uses HTTP/HTTPS, not WebSocket protocols
          const protocol = window.location.protocol; // Keep as-is: 'http:' or 'https:'
          const host = window.location.host;
          return `${protocol}//${host}`;
        })();

        // Note: VibeTunnel is running with --no-auth, so we don't need to send a token
        // The SSE endpoint is open and doesn't require authentication
        const url = `${baseUrl}/api/sessions/${this.config.sessionId}/stream`;
        console.log('[TerminalSSE] Connecting to:', url);

        this.eventSource = new EventSource(url);

        this.eventSource.onopen = () => {
          console.log('[TerminalSSE] Connected');
          this.updateStatus({
            connected: true,
            reconnecting: false,
          });
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.eventSource.onerror = (error) => {
          console.error('[TerminalSSE] Connection error:', error);
          const errorMsg = 'Stream connection error';
          this.updateStatus({
            connected: false,
            reconnecting: false,
            error: errorMsg,
          });
          const err = new Error(errorMsg);
          this.config.onError?.(err);
          reject(err);
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.updateStatus({
          connected: false,
          reconnecting: false,
          error: err.message,
        });
        this.config.onError?.(err);
        reject(err);
      }
    });
  }

  /**
   * Disconnect from SSE stream
   */
  public disconnect(): void {
    // Flush any pending output
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.flushOutputBuffer();
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateStatus({
      connected: false,
      reconnecting: false,
    });
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.status.connected && this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Handle incoming SSE message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Header message (session metadata)
      if (data.version && data.width && data.height) {
        console.log('[TerminalSSE] Received session header:', {
          version: data.version,
          width: data.width,
          height: data.height,
        });
        return;
      }

      // Cast event: [timestamp, type, data]
      if (Array.isArray(data) && data.length >= 3) {
        const [timestamp, type, eventData] = data;

        // Session exit event
        if (timestamp === 'exit') {
          console.log('[TerminalSSE] Session exited:', eventData);
          this.disconnect();
          this.config.onSessionExit?.(eventData as number);
          return;
        }

        // Output event
        if (type === 'o') {
          this.addToOutputBuffer(eventData as string);
        }
        // Ignore resize ('r') and input ('i') events
      }
    } catch (error) {
      console.error('[TerminalSSE] Failed to parse message:', error);
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Add data to output buffer (batched for performance)
   */
  private addToOutputBuffer(data: string): void {
    this.outputBuffer += data;

    // Schedule flush if not already scheduled
    if (this.batchTimeout === null) {
      this.batchTimeout = window.setTimeout(() => this.flushOutputBuffer(), this.batchDelay);
    }
  }

  /**
   * Flush buffered output to callback
   */
  private flushOutputBuffer(): void {
    if (this.outputBuffer.length > 0) {
      this.config.onOutput(this.outputBuffer);
      this.outputBuffer = '';
    }
    this.batchTimeout = null;
  }

  /**
   * Update connection status and notify callback
   */
  private updateStatus(status: Partial<ConnectionStatus>): void {
    this.status = {
      ...this.status,
      ...status,
    };
    this.config.onStatusChange?.(this.status);
  }
}
