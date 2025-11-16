/**
 * TerminalWebSocket
 *
 * Manages VibeTunnel terminal communication with hybrid protocol:
 * - Input: WebSocket to `/ws/input` (sends keyboard input)
 * - Output: SSE to `/api/sessions/:id/stream` (receives terminal output with full scrollback)
 *
 * The SSE stream uses asciinema cast format and replays the entire session history,
 * ensuring we have complete scrollback from session start. This is VibeTunnel's proven
 * approach that naturally builds scrollback in xterm.js.
 */

import type { ConnectionStatus, KeyboardInputEvent } from '@/web/shared/types/console';
import { TerminalSSE } from './TerminalSSE';

export interface TerminalWebSocketConfig {
  /**
   * Session ID to connect to
   */
  sessionId: string;

  /**
   * Base WebSocket URL (e.g., "ws://localhost:3000")
   */
  baseUrl: string;

  /**
   * Callback when output is received from terminal
   */
  onOutput: (data: string) => void;

  /**
   * Callback when connection status changes
   */
  onStatusChange: (status: ConnectionStatus) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;
}

/**
 * Special key names that need to be wrapped in null bytes
 */
const SPECIAL_KEYS = new Set([
  'Enter',
  'Backspace',
  'Tab',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
]);

/**
 * Map keyboard event keys to VibeTunnel protocol names
 */
const KEY_NAME_MAP: Record<string, string> = {
  Enter: 'enter',
  Backspace: 'backspace',
  Tab: 'tab',
  Escape: 'escape',
  ArrowUp: 'arrow_up',
  ArrowDown: 'arrow_down',
  ArrowLeft: 'arrow_left',
  ArrowRight: 'arrow_right',
  Home: 'home',
  End: 'end',
  PageUp: 'page_up',
  PageDown: 'page_down',
  Insert: 'insert',
  Delete: 'delete',
};

export class TerminalWebSocket {
  private config: TerminalWebSocketConfig;
  private inputWs: WebSocket | null = null;
  private outputSSE: TerminalSSE | null = null;
  private status: ConnectionStatus;
  private inputConnected = false;
  private outputConnected = false;

  constructor(config: TerminalWebSocketConfig) {
    this.config = config;
    this.status = {
      connected: false,
      reconnecting: false,
    };
  }

  /**
   * Connect to VibeTunnel endpoints (Input WebSocket + Output SSE)
   */
  public async connect(): Promise<void> {
    try {
      this.updateStatus({
        connected: false,
        reconnecting: true,
      });

      // Reset connection state
      this.inputConnected = false;
      this.outputConnected = false;

      // Connect both input and output, waiting for both to be ready
      await Promise.all([
        this.connectInput(),
        this.connectOutputSSE()
      ]);

      // Only mark as connected if both are successful
      this.updateStatus({
        connected: true,
        reconnecting: false,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateStatus({
        connected: false,
        reconnecting: false,
        error: err.message,
      });
      this.config.onError?.(err);
      throw error;
    }
  }

  /**
   * Disconnect from endpoints
   */
  public disconnect(): void {
    if (this.inputWs) {
      this.inputWs.close();
      this.inputWs = null;
    }

    if (this.outputSSE) {
      this.outputSSE.disconnect();
      this.outputSSE = null;
    }

    this.inputConnected = false;
    this.outputConnected = false;

    this.updateStatus({
      connected: false,
      reconnecting: false,
    });
  }

  /**
   * Send keyboard input to terminal
   *
   * Regular text: sent as-is
   * Special keys: wrapped in null bytes (\x00key_name\x00)
   */
  public sendInput(input: string | KeyboardInputEvent): void {
    if (!this.inputWs || this.inputWs.readyState !== WebSocket.OPEN) {
      console.warn('[TerminalWebSocket] Cannot send input: not connected');
      return;
    }

    let message: string;

    if (typeof input === 'string') {
      message = input;
    } else {
      message = this.formatKeyboardInput(input);
    }

    this.inputWs.send(message);
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return (
      this.status.connected &&
      this.inputWs?.readyState === WebSocket.OPEN &&
      this.outputSSE?.isConnected() === true
    );
  }

  /**
   * Connect to input WebSocket (/ws/input)
   */
  private async connectInput(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get auth token from localStorage (synced by api.service.ts)
      const token = localStorage.getItem('cc-devtools-auth-token');

      // Build WebSocket URL with sessionId and token parameters
      const params = new URLSearchParams();
      params.append('sessionId', this.config.sessionId);
      if (token) {
        params.append('token', token);
      }

      const url = `${this.config.baseUrl}/ws/input?${params.toString()}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[TerminalWebSocket] Input WebSocket connected');
        this.inputWs = ws;
        this.inputConnected = true;
        resolve();
      };

      ws.onerror = (event) => {
        console.error('[TerminalWebSocket] Input WebSocket error:', event);
        this.inputConnected = false;
        reject(new Error('Failed to connect to input WebSocket'));
      };

      ws.onclose = () => {
        console.log('[TerminalWebSocket] Input WebSocket closed');
        this.inputConnected = false;
        if (this.inputWs === ws) {
          this.inputWs = null;
          this.updateConnectionState();
        }
      };
    });
  }

  /**
   * Connect to output SSE stream (/api/sessions/:id/stream)
   */
  private async connectOutputSSE(): Promise<void> {
    // Convert WebSocket URL to HTTP URL for SSE
    const httpBaseUrl = this.config.baseUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');

    this.outputSSE = new TerminalSSE({
      sessionId: this.config.sessionId,
      baseUrl: httpBaseUrl,
      onOutput: (data) => {
        // Forward output directly to callback (already batched by TerminalSSE)
        this.config.onOutput(data);
      },
      onStatusChange: (status) => {
        // Track output connection state
        this.outputConnected = status.connected;

        // Update overall connection state based on both connections
        this.updateConnectionState();
      },
      onError: (error) => {
        console.error('[TerminalWebSocket] SSE error:', error);
        this.config.onError?.(error);
      },
      onSessionExit: (exitCode) => {
        console.log('[TerminalWebSocket] Session exited with code:', exitCode);
        this.disconnect();
      },
    });

    await this.outputSSE.connect();
    console.log('[TerminalWebSocket] SSE stream connected for session:', this.config.sessionId);
  }

  /**
   * Format keyboard input event into protocol message
   */
  private formatKeyboardInput(input: KeyboardInputEvent): string {
    const { key, modifiers } = input;

    // Handle special keys (wrapped in null bytes)
    if (SPECIAL_KEYS.has(key)) {
      const keyName = KEY_NAME_MAP[key] ?? key.toLowerCase();
      return `\x00${keyName}\x00`;
    }

    // Handle modifier combinations
    if (modifiers.ctrl || modifiers.alt || modifiers.meta) {
      // Ctrl+C, Ctrl+D, etc. are sent as control characters
      if (modifiers.ctrl && key.length === 1) {
        const char = key.toLowerCase();
        const code = char.charCodeAt(0);

        // Ctrl+A = 0x01, Ctrl+B = 0x02, ..., Ctrl+Z = 0x1A
        if (code >= 97 && code <= 122) {
          const ctrlCode = code - 96;
          return String.fromCharCode(ctrlCode);
        }
      }

      // For other modifier combinations, send the key as-is
      // The terminal may handle them differently
      return key;
    }

    // Regular text input
    return key;
  }

  /**
   * Update overall connection state based on individual connection states
   * Only reports connected when BOTH input and output are connected
   */
  private updateConnectionState(): void {
    const bothConnected = this.inputConnected && this.outputConnected;
    const eitherDisconnected = !this.inputConnected || !this.outputConnected;

    if (bothConnected && !this.status.connected) {
      this.updateStatus({
        connected: true,
        reconnecting: false,
      });
    } else if (eitherDisconnected && this.status.connected) {
      let error: string | undefined;
      if (!this.inputConnected && !this.outputConnected) {
        error = 'Both connections closed';
      } else if (!this.inputConnected) {
        error = 'Input connection closed';
      } else {
        error = 'Output connection closed';
      }

      this.updateStatus({
        connected: false,
        reconnecting: false,
        error,
      });
    }
  }

  /**
   * Update connection status and notify callback
   */
  private updateStatus(status: Partial<ConnectionStatus>): void {
    this.status = { ...this.status, ...status };
    this.config.onStatusChange(this.status);
  }
}
