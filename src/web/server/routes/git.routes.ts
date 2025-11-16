/**
 * Git API routes
 * RESTful endpoints for git status information
 */

import path from 'path';

import { Router, type Request, type Response } from 'express';

import { GitStatusService } from '../services/git.service.js';
import * as logger from '../utils/logger.js';

import type { GitStatusResponse, GitFileStatusResponse } from '../../shared/types/git.js';

const router = Router();

// Create singleton git service instance for project root
const gitService = new GitStatusService(process.cwd());

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle async route errors
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: (err: unknown) => void): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * Send error response with consistent format
 */
function sendError(res: Response, statusCode: number, message: string, code: string): void {
  res.status(statusCode).json({
    error: {
      message,
      code
    }
  });
}

// ============================================================================
// Git Endpoints
// ============================================================================

/**
 * GET /api/git/status
 * Get git status for entire repository
 */
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  logger.debug('GET /api/git/status');

  try {
    const status = await gitService.getGitStatus();

    const response: GitStatusResponse = status;

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Git status failed:', errorMessage);
    sendError(res, 500, 'Git status failed', 'GIT_ERROR');
  }
}));

/**
 * GET /api/git/file-status?path=...
 * Get git status for specific file
 */
router.get('/file-status', asyncHandler(async (req: Request, res: Response) => {
  const filePath = req.query.path as string | undefined;

  if (!filePath) {
    sendError(res, 400, 'Missing path query parameter', 'VALIDATION_ERROR');
    return;
  }

  logger.debug(`GET /api/git/file-status?path=${filePath}`);

  try {
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const fileStatus = await gitService.getFileStatus(absolutePath);

    const response: GitFileStatusResponse = {
      file: fileStatus
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Git file status failed:', errorMessage);
    sendError(res, 500, 'Git file status failed', 'GIT_ERROR');
  }
}));

/**
 * POST /api/git/clear-cache
 * Clear git status cache (force refresh on next request)
 */
router.post('/clear-cache', asyncHandler((_req: Request, res: Response) => {
  logger.debug('POST /api/git/clear-cache');

  try {
    gitService.clearCache();
    logger.info('✅ Git cache cleared');

    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Git cache clear failed:', errorMessage);
    sendError(res, 500, 'Cache clear failed', 'GIT_ERROR');
  }

  return Promise.resolve();
}));

export { router as gitRouter };
