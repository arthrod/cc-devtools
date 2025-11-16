/**
 * System information API routes
 * Provides environment and system-level information to the frontend
 */

import * as os from 'os';

import { Router, type Request, type Response } from 'express';

import * as logger from '../utils/logger.js';

import type { SystemInfoResponse } from '../../shared/types/system.js';

const router = Router();

/**
 * GET /api/system/info
 * Get system environment information
 */
router.get('/info', (_req: Request, res: Response) => {
  logger.debug('GET /api/system/info');

  const response: SystemInfoResponse = {
    info: {
      homeDir: os.homedir(),
      platform: os.platform(),
      cwd: process.cwd(),
    },
  };

  res.json(response);
});

export { router as systemRouter };
