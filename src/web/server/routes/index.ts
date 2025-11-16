/**
 * Route aggregator
 * Combines all API routes with authentication
 */

import { Router, type Request, type Response } from 'express';

import { createAuthMiddleware, createSSEAuthMiddleware } from '../middleware/auth.middleware.js';
import { getFileWatcher } from '../sse/fileWatcher.js';
import type { TokenStore } from '../types.js';
import * as logger from '../utils/logger.js';

import { consoleRouter } from './console.routes.js';
import { createFilesRouter } from './files.routes.js';
import { gitRouter } from './git.routes.js';
import { kanbanRouter } from './kanban.routes.js';
import { memoryRouter } from './memory.routes.js';
import { perFileRunnerRouter } from './per-file-runner.routes.js';
import { plansRouter } from './plans.routes.js';
import { projectRouter } from './project.routes.js';
import { systemRouter } from './system.routes.js';

import type { WebConfig } from '../../shared/types.js';

/**
 * Create API router with all routes
 * @param tokenStore - Token store for authentication
 * @param config - Web server configuration
 * @returns Express router with all API routes
 */
export function createAPIRouter(tokenStore: TokenStore, config: WebConfig): Router {
  const router = Router();

  // Public project routes (no authentication required)
  router.use('/project', projectRouter);

  // Public system routes (no authentication required)
  router.use('/system', systemRouter);

  // Apply authentication to all kanban routes
  router.use('/kanban', createAuthMiddleware(tokenStore), kanbanRouter);

  // Apply authentication to all file routes
  router.use('/files', createAuthMiddleware(tokenStore), createFilesRouter(config));

  // Apply authentication to all console routes
  router.use('/console', createAuthMiddleware(tokenStore), consoleRouter);

  // Apply authentication to all memory routes
  router.use('/memory', createAuthMiddleware(tokenStore), memoryRouter);

  // Apply authentication to all plans routes
  router.use('/plans', createAuthMiddleware(tokenStore), plansRouter);

  // Apply authentication to all git routes
  router.use('/git', createAuthMiddleware(tokenStore), gitRouter);

  // Apply SSE-compatible authentication to per-file-runner routes
  // (SSE endpoints like /run need query param token support)
  router.use('/per-file-runner', createSSEAuthMiddleware(tokenStore), perFileRunnerRouter);

  // SSE endpoint for real-time file updates
  // NOTE: EventSource doesn't support custom headers, so we accept token via query param
  router.get(
    '/sse',
    createSSEAuthMiddleware(tokenStore),
    (req: Request, res: Response) => {
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Disable compression for SSE
      res.flushHeaders();

      try {
        // Add client to file watcher
        const fileWatcher = getFileWatcher();
        const clientId = fileWatcher.addClient(res);

        logger.info(`SSE connection established: ${clientId} from ${req.ip}`);

        // Handle client disconnection
        req.on('close', () => {
          fileWatcher.removeClient(clientId);
          logger.info(`SSE connection closed: ${clientId}`);
        });
      } catch (error) {
        logger.error('Failed to establish SSE connection:', error);
        res.end();
      }
    }
  );

  return router;
}
