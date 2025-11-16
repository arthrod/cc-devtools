/**
 * File watcher service with Server-Sent Events (SSE) support
 *
 * Watches the .claude/kanban/ directory for file changes and broadcasts
 * events to all connected SSE clients for real-time updates.
 */

import path from 'node:path';

import chokidar, { type FSWatcher } from 'chokidar';

import * as logger from '../utils/logger.js';

import type { SSEConfig, SSEEvent, SSEEventType } from '../../shared/types.js';
import type { Response } from 'express';


/**
 * SSE client connection wrapper
 */
interface SSEClient {
  id: string;
  res: Response;
  connectedAt: Date;
}

/**
 * File watcher service managing SSE connections and file watching
 */
export class FileWatcherService {
  private watcher: FSWatcher | null = null;
  private clients: Map<string, SSEClient> = new Map();
  private pingIntervalId: NodeJS.Timeout | null = null;
  private watchPath: string;
  private config: SSEConfig;

  constructor(watchPath: string, config: SSEConfig) {
    this.watchPath = watchPath;
    this.config = config;
  }

  /**
   * Start watching files and initialize ping mechanism
   */
  start(): void {
    if (this.watcher) {
      logger.warn('File watcher already started');
      return;
    }

    // Resolve to absolute path
    const absolutePath = path.resolve(this.watchPath);
    logger.info(`Starting file watcher for: ${absolutePath}`);

    // Initialize chokidar watcher
    this.watcher = chokidar.watch(absolutePath, {
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait for file write to stabilize
        pollInterval: 50,
      },
      depth: 5, // Limit recursion depth
    });

    // Set up event handlers
    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => {
        logger.error('File watcher error:', error);
      })
      .on('ready', () => {
        logger.info('File watcher ready');
      });

    // Start keep-alive ping mechanism
    this.startPingInterval();
  }

  /**
   * Stop watching files and clean up resources
   */
  async stop(): Promise<void> {
    logger.info('Stopping file watcher service');

    // Stop ping interval
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    // Close all SSE connections
    this.clients.forEach((client) => {
      this.removeClient(client.id);
    });
    this.clients.clear();

    // Close file watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    logger.info('File watcher service stopped');
  }

  /**
   * Add new SSE client connection
   */
  addClient(res: Response): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const client: SSEClient = {
      id: clientId,
      res,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);
    logger.info(`SSE client connected: ${clientId} (${this.clients.size} total)`);

    // Send initial connection event
    this.sendToClient(client, {
      type: 'ping',
      data: { message: 'Connected to file watcher' },
    });

    return clientId;
  }

  /**
   * Remove SSE client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.res.end();
      } catch {
        // Ignore errors when closing connection
      }
      this.clients.delete(clientId);
      logger.info(`SSE client disconnected: ${clientId} (${this.clients.size} remaining)`);
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Handle file system events and broadcast to clients
   */
  private handleFileEvent(eventType: string, filePath: string): void {
    logger.debug(`File event: ${eventType} - ${filePath}`);

    let eventTypeToSend: SSEEventType | null = null;

    // Determine event type based on file path
    if (filePath.includes('cc-devtools/memory.yaml')) {
      eventTypeToSend = 'memory_changed';
    } else if (filePath.includes('cc-devtools/plans/')) {
      eventTypeToSend = 'plan_changed';
    } else if (filePath.includes('.claude/kanban') || filePath.includes('cc-devtools/kanban/')) {
      eventTypeToSend = 'kanban_changed';
    }

    // Broadcast event if it matches a watched pattern
    if (eventTypeToSend) {
      const event: SSEEvent = {
        type: eventTypeToSend,
        data: {
          eventType,
          path: filePath,
          timestamp: new Date().toISOString(),
        },
      };

      this.broadcast(event);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  private broadcast(event: SSEEvent): void {
    if (this.clients.size === 0) {
      return;
    }

    logger.debug(`Broadcasting event to ${this.clients.size} clients:`, event.type);

    const deadClients: string[] = [];

    this.clients.forEach((client) => {
      const success = this.sendToClient(client, event);
      if (!success) {
        deadClients.push(client.id);
      }
    });

    // Clean up dead connections
    deadClients.forEach((clientId) => {
      this.removeClient(clientId);
    });
  }

  /**
   * Send event to specific client
   */
  private sendToClient(client: SSEClient, event: SSEEvent): boolean {
    try {
      const data = JSON.stringify(event);
      client.res.write(`data: ${data}\n\n`);
      return true;
    } catch (_error) {
      logger.warn(`Failed to send to client ${client.id}`);
      return false;
    }
  }

  /**
   * Start periodic keep-alive ping to all clients
   */
  private startPingInterval(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }

    this.pingIntervalId = setInterval(() => {
      const pingEvent: SSEEvent = {
        type: 'ping',
        data: { timestamp: new Date().toISOString() },
      };

      this.broadcast(pingEvent);
    }, this.config.pingInterval);

    logger.debug(`SSE keep-alive ping started (interval: ${this.config.pingInterval}ms)`);
  }
}

/**
 * Singleton instance of file watcher service
 */
let fileWatcherInstance: FileWatcherService | null = null;

/**
 * Initialize file watcher service
 */
export function initializeFileWatcher(watchPath: string, config: SSEConfig): FileWatcherService {
  if (fileWatcherInstance) {
    logger.warn('File watcher already initialized');
    return fileWatcherInstance;
  }

  fileWatcherInstance = new FileWatcherService(watchPath, config);
  return fileWatcherInstance;
}

/**
 * Get file watcher instance
 */
export function getFileWatcher(): FileWatcherService {
  if (!fileWatcherInstance) {
    throw new Error('File watcher not initialized. Call initializeFileWatcher() first.');
  }
  return fileWatcherInstance;
}

/**
 * Stop and clean up file watcher
 */
export async function shutdownFileWatcher(): Promise<void> {
  if (fileWatcherInstance) {
    await fileWatcherInstance.stop();
    fileWatcherInstance = null;
  }
}
