/**
 * Project information routes
 * Provides project metadata like working directory and name from package.json
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

import { Router, type Request, type RequestHandler, type Response } from 'express';

import * as logger from '../utils/logger.js';

const router = Router();

/**
 * Express async handler wrapper to handle promise rejections
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
}

/**
 * GET /system-info
 * Returns working directory and project name from package.json
 */
router.get('/system-info', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const workingDirectory = process.cwd();
    let directoryName = 'CC-DevTools';

    // Try to read package.json from current working directory
    try {
      const packageJsonPath = join(workingDirectory, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;

      if (packageJson.name) {
        directoryName = packageJson.name;
      }
    } catch (error) {
      // If package.json doesn't exist or can't be read, use fallback
      logger.debug('Could not read package.json, using fallback directory name', { error });
    }

    res.json({
      success: true,
      data: {
        workingDirectory,
        directoryName
      }
    });
  } catch (error) {
    logger.error('Failed to get system info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system information'
    });
  }
}));

export { router as projectRouter };
