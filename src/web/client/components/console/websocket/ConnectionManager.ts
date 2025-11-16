/**
 * ConnectionManager
 *
 * Manages WebSocket connection lifecycle with automatic reconnection.
 * Features:
 * - Exponential backoff retry (100ms → 5min, up to 5 minutes total)
 * - Input queuing during disconnect (up to 1KB)
 * - Session validation on reconnect
 * - Output catch-up via snapshot API
 */

import type { ConnectionStatus, KeyboardInputEvent } from '@/web/shared/types/console';
import { TerminalWebSocket, type TerminalWebSocketConfig } from './TerminalWebSocket';

export interface ConnectionManagerConfig extends Omit<TerminalWebSocketConfig, 'onStatusChange'> {
  /**
   * Callback when connection status changes
   */
  onStatusChange?: (status: ConnectionStatus) => void;

  /**
   * Maximum total retry time in milliseconds (default: 5 minutes)
   */
  maxRetryTime?: number;

  /**
   * Maximum input queue size in bytes (default: 1KB)
   */
  maxInputQueueSize?: number;
}

/**
 * Retry schedule: exponential backoff up to 5 seconds, then every 5 seconds
 * [100ms, 200ms, 500ms, 1s, 3s, 5s, 5s, 5s, ...]
 */
const RETRY_DELAYS = [100, 200, 500, 1000, 3000, 5000];
const DEFAULT_MAX_RETRY_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_INPUT_QUEUE_SIZE = 1024; // 1KB
const MAX_CONSECUTIVE_FAILURES = 3; // Circuit breaker: stop after 3 consecutive failures

// Track active instances for debugging
let instanceCounter = 0;
const activeInstances = new Set<number>();

// Singleton registry: Ensure only one active connection per session
const activeConnections = new Map<string, ConnectionManager>();

export class ConnectionManager {
  private instanceId: number;
  private config: ConnectionManagerConfig;
  private ws: TerminalWebSocket | null = null;
  private status: ConnectionStatus;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private retryStartTime: number | null = null;
  private retryCount = 0;
  private inputQueue: string[] = [];
  private inputQueueSize = 0;
  private hasConnectedBefore = false; // Track if we've connected successfully before
  private consecutiveFailures = 0; // Circuit breaker: count consecutive failures
  private circuitBreakerOpen = false; // Circuit breaker: stop retrying when true
  private isConnecting = false; // Lock to prevent multiple simultaneous connection attempts
  private isDisconnecting = false; // Flag to prevent retries during explicit disconnect
  private isAborted = false; // Flag to abort in-flight connection attempts

  constructor(config: ConnectionManagerConfig) {
    // Assign instance ID for debugging
    this.instanceId = ++instanceCounter;
    activeInstances.add(this.instanceId);

    console.log(
      `[ConnectionManager #${this.instanceId}] Created for session ${config.sessionId}. Active instances: ${activeInstances.size}`
    );

    // SINGLETON: Check if a connection already exists for this session
    const existingConnection = activeConnections.get(config.sessionId);
    if (existingConnection && existingConnection !== this) {
      console.warn(
        `[ConnectionManager #${this.instanceId}] Duplicate connection detected for session ${config.sessionId}. Disconnecting old instance #${existingConnection.instanceId}`
      );
      existingConnection.disconnect();
    }

    // Register this instance as the active connection for this session
    activeConnections.set(config.sessionId, this);
    console.log(
      `[ConnectionManager #${this.instanceId}] Registered as active connection for session ${config.sessionId}`
    );

    // ALERT if too many instances
    if (activeInstances.size > 3) {
      console.error(
        `[ConnectionManager] WARNING: ${activeInstances.size} active instances detected! Possible memory leak.`
      );
    }

    this.config = {
      maxRetryTime: DEFAULT_MAX_RETRY_TIME,
      maxInputQueueSize: DEFAULT_MAX_INPUT_QUEUE_SIZE,
      ...config,
    };

    this.status = {
      connected: false,
      reconnecting: false,
      retryCount: 0,
    };
  }

  /**
   * Connect to WebSocket with automatic retry
   */
  public async connect(): Promise<void> {
    // SINGLETON: Check if we're still the active connection for this session
    const activeConnection = activeConnections.get(this.config.sessionId);
    if (activeConnection !== this) {
      console.log(
        `[ConnectionManager #${this.instanceId}] Not the active connection for session ${this.config.sessionId} (active: #${activeConnection?.instanceId ?? 'none'}). Aborting.`
      );
      this.isAborted = true;
      return;
    }

    // ABORT: Don't connect if instance has been destroyed
    if (this.isAborted) {
      console.log(`[ConnectionManager #${this.instanceId}] Connection aborted - instance destroyed`);
      return;
    }

    // LOCK: Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.warn(`[ConnectionManager #${this.instanceId}] Connection attempt already in progress, ignoring`);
      return;
    }

    // CIRCUIT BREAKER: Stop if we've had too many consecutive failures
    if (this.circuitBreakerOpen) {
      console.error(`[ConnectionManager #${this.instanceId}] Circuit breaker open - too many consecutive failures`);
      this.updateStatus({
        connected: false,
        reconnecting: false,
        retryCount: this.retryCount,
        error: 'Connection failed after multiple attempts. Please refresh the page.',
      });
      return;
    }

    // Set connection lock
    this.isConnecting = true;
    console.log(`[ConnectionManager #${this.instanceId}] Starting connection attempt #${this.consecutiveFailures + 1}`);

    // Clear any existing retry timeout
    this.clearRetryTimeout();

    try {
      // Only validate session on reconnects, not initial connection
      // This prevents validation failures when session is still initializing
      if (this.hasConnectedBefore) {
        const isValid = await this.validateSession();

        // Check if we're still the active connection after async validation
        if (activeConnections.get(this.config.sessionId) !== this) {
          console.log(`[ConnectionManager #${this.instanceId}] No longer active connection after validation. Aborting.`);
          this.isAborted = true;
          this.isConnecting = false;
          return;
        }

        // Check if aborted after async validation
        if (this.isAborted) {
          console.log(`[ConnectionManager #${this.instanceId}] Connection aborted after validation - instance destroyed`);
          this.isConnecting = false;
          return;
        }

        if (!isValid) {
          throw new Error('Session validation failed');
        }
      } else {
        console.log('[ConnectionManager] Skipping validation on initial connect');
      }

      // Check if we're still the active connection before creating WebSocket
      if (activeConnections.get(this.config.sessionId) !== this) {
        console.log(`[ConnectionManager #${this.instanceId}] No longer active connection before WebSocket creation. Aborting.`);
        this.isAborted = true;
        this.isConnecting = false;
        return;
      }

      // Check if aborted before creating WebSocket
      if (this.isAborted) {
        console.log(`[ConnectionManager #${this.instanceId}] Connection aborted before WebSocket creation - instance destroyed`);
        this.isConnecting = false;
        return;
      }

      // Create new WebSocket connection
      // Store in local variable so we can clean it up even if this.ws gets nulled by disconnect()
      const ws = new TerminalWebSocket({
        ...this.config,
        onStatusChange: (status) => {
          this.handleStatusChange(status);
        },
      });
      this.ws = ws;

      await ws.connect();

      // Check if we're still the active connection after async connect
      if (activeConnections.get(this.config.sessionId) !== this) {
        console.log(`[ConnectionManager #${this.instanceId}] No longer active connection after WebSocket connect. Aborting and cleaning up.`);
        this.isAborted = true;
        // Clean up using local reference (this.ws may have been nulled by disconnect())
        ws.disconnect();
        this.ws = null;
        this.isConnecting = false;
        return;
      }

      // Check if aborted after async connect
      if (this.isAborted) {
        console.log(`[ConnectionManager #${this.instanceId}] Connection aborted after WebSocket connect - instance destroyed, cleaning up`);
        // Clean up using local reference (this.ws may have been nulled by disconnect())
        ws.disconnect();
        this.ws = null;
        this.isConnecting = false;
        return;
      }

      // Check if this is a reconnect (before setting flag)
      const isReconnect = this.hasConnectedBefore;

      // Connection successful - reset failure counters and circuit breaker
      this.hasConnectedBefore = true;
      this.retryCount = 0;
      this.retryStartTime = null;
      this.consecutiveFailures = 0;
      this.circuitBreakerOpen = false;
      this.isConnecting = false; // Release lock

      console.log(`[ConnectionManager #${this.instanceId}] Connection successful`);

      // Flush queued input
      await this.flushInputQueue();

      // Note: VibeTunnel's /buffers WebSocket will send current terminal state
      // after subscription, so we don't need a separate snapshot API call
    } catch (error) {
      // Release lock on error
      this.isConnecting = false;

      console.error(`[ConnectionManager #${this.instanceId}] Connection failed:`, error);
      const err = error instanceof Error ? error : new Error(String(error));

      // Increment consecutive failure counter
      this.consecutiveFailures++;
      console.error(`[ConnectionManager #${this.instanceId}] Consecutive failures: ${this.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`);

      // Open circuit breaker if too many consecutive failures
      if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(
          `[ConnectionManager #${this.instanceId}] Circuit breaker triggered after ${this.consecutiveFailures} consecutive failures`
        );
        this.circuitBreakerOpen = true;
        this.updateStatus({
          connected: false,
          reconnecting: false,
          retryCount: this.retryCount,
          error: `Connection failed after ${this.consecutiveFailures} attempts. Please check your connection and refresh the page.`,
        });
        this.config.onError?.(new Error('Circuit breaker triggered - too many consecutive failures'));
        return;
      }

      this.config.onError?.(err);

      // Schedule retry if circuit breaker not open
      this.scheduleRetry();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    console.log(`[ConnectionManager #${this.instanceId}] Explicit disconnect called`);

    // Set flags to prevent zombie retries and abort in-flight connections
    this.isDisconnecting = true;
    this.isAborted = true;

    this.clearRetryTimeout();
    this.retryStartTime = null;
    this.retryCount = 0;
    this.hasConnectedBefore = false; // Reset on explicit disconnect
    this.consecutiveFailures = 0; // Reset circuit breaker on explicit disconnect
    this.circuitBreakerOpen = false;
    this.isConnecting = false; // Release connection lock

    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }

    this.updateStatus({
      connected: false,
      reconnecting: false,
      retryCount: 0,
    });

    // Remove from active instances
    activeInstances.delete(this.instanceId);

    // Remove from singleton registry (only if we're the active connection)
    if (activeConnections.get(this.config.sessionId) === this) {
      activeConnections.delete(this.config.sessionId);
      console.log(
        `[ConnectionManager #${this.instanceId}] Unregistered from active connections for session ${this.config.sessionId}`
      );
    }

    console.log(
      `[ConnectionManager #${this.instanceId}] Destroyed. Active instances: ${activeInstances.size}, Active connections: ${activeConnections.size}`
    );

    // Reset flag after cleanup (keep isAborted=true to prevent in-flight connections)
    this.isDisconnecting = false;
  }

  /**
   * Send input to terminal (queues if disconnected)
   */
  public sendInput(input: string | KeyboardInputEvent): void {
    // Don't send if instance is aborted
    if (this.isAborted) {
      return;
    }

    if (this.ws?.isConnected()) {
      // Connected - send immediately
      this.ws.sendInput(input);
    } else {
      // Disconnected - queue input
      const inputStr = typeof input === 'string' ? input : input.key;
      this.queueInput(inputStr);
    }
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
    return this.ws?.isConnected() ?? false;
  }

  /**
   * Validate session exists and is active
   */
  private async validateSession(): Promise<boolean> {
    try {
      const response = await fetch(`/api/sessions/${this.config.sessionId}`);

      if (!response.ok) {
        console.error('[ConnectionManager] Session validation failed:', response.status);
        return false;
      }

      const session = await response.json();

      if (!session || !session.id) {
        console.error('[ConnectionManager] Invalid session response');
        return false;
      }

      console.log('[ConnectionManager] Session validated:', session.id);
      return true;
    } catch (error) {
      console.error('[ConnectionManager] Session validation error:', error);
      return false;
    }
  }

  /**
   * Catch up on missed output via snapshot API
   */
  private async catchUpOutput(): Promise<void> {
    try {
      const response = await fetch(`/api/sessions/${this.config.sessionId}/snapshot`);

      if (!response.ok) {
        console.warn('[ConnectionManager] Failed to fetch output snapshot:', response.status);
        return;
      }

      const snapshot = await response.text();

      if (snapshot && snapshot.length > 0) {
        console.log('[ConnectionManager] Caught up on output:', snapshot.length, 'bytes');
        this.config.onOutput(snapshot);
      }
    } catch (error) {
      console.warn('[ConnectionManager] Error catching up on output:', error);
    }
  }

  /**
   * Queue input during disconnect (up to max size)
   */
  private queueInput(input: string): void {
    const inputSize = new Blob([input]).size;
    const maxSize = this.config.maxInputQueueSize ?? DEFAULT_MAX_INPUT_QUEUE_SIZE;

    if (this.inputQueueSize + inputSize > maxSize) {
      console.warn('[ConnectionManager] Input queue full, dropping input');
      return;
    }

    this.inputQueue.push(input);
    this.inputQueueSize += inputSize;
    console.log('[ConnectionManager] Queued input:', input.length, 'chars');
  }

  /**
   * Flush queued input after reconnection
   */
  private async flushInputQueue(): Promise<void> {
    if (this.inputQueue.length === 0) {
      return;
    }

    console.log('[ConnectionManager] Flushing input queue:', this.inputQueue.length, 'items');

    for (const input of this.inputQueue) {
      this.ws?.sendInput(input);
    }

    this.inputQueue = [];
    this.inputQueueSize = 0;
  }

  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleRetry(): void {
    // Don't schedule retry if we're explicitly disconnecting or aborted
    if (this.isDisconnecting || this.isAborted) {
      console.log(`[ConnectionManager #${this.instanceId}] Skipping retry - ${this.isAborted ? 'instance destroyed' : 'explicit disconnect in progress'}`);
      return;
    }

    // Check if we've exceeded max retry time
    if (!this.retryStartTime) {
      this.retryStartTime = Date.now();
    }

    const elapsedTime = Date.now() - this.retryStartTime;
    const maxRetryTime = this.config.maxRetryTime ?? DEFAULT_MAX_RETRY_TIME;

    if (elapsedTime > maxRetryTime) {
      console.error('[ConnectionManager] Max retry time exceeded, giving up');
      this.updateStatus({
        connected: false,
        reconnecting: false,
        retryCount: this.retryCount,
        maxRetries: this.retryCount,
        error: 'Max retry time exceeded',
      });
      return;
    }

    // Calculate retry delay using exponential backoff
    const delayIndex = Math.min(this.retryCount, RETRY_DELAYS.length - 1);
    const delay = RETRY_DELAYS[delayIndex] ?? 5000;

    this.retryCount++;

    this.updateStatus({
      connected: false,
      reconnecting: true,
      retryCount: this.retryCount,
    });

    console.log(
      `[ConnectionManager] Scheduling retry #${this.retryCount} in ${delay}ms`
    );

    this.retryTimeoutId = setTimeout(() => {
      void this.connect();
    }, delay);
  }

  /**
   * Clear retry timeout
   */
  private clearRetryTimeout(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  /**
   * Handle status change from WebSocket
   */
  private handleStatusChange(status: ConnectionStatus): void {
    // Don't update status if instance is aborted
    if (this.isAborted) {
      return;
    }

    this.updateStatus(status);

    // If connection closed unexpectedly, schedule retry
    // Don't retry if we're explicitly disconnecting (prevents zombie retries)
    if (!status.connected && !status.reconnecting && !this.retryTimeoutId && !this.isDisconnecting) {
      this.scheduleRetry();
    }
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(status: Partial<ConnectionStatus>): void {
    this.status = { ...this.status, ...status };
    this.config.onStatusChange?.(this.status);
  }
}
