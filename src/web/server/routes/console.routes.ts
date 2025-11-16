/**
 * Console routes
 * REST API endpoints for terminal session management
 * Single-user mode: all sessions shared globally
 */

import { Router, type Request, type Response } from 'express';

import * as consoleService from '../services/console.service.js';
import * as logger from '../utils/logger.js';

import type {
  CreateSessionRequest,
  CreateSessionResponse,
  UpdateSessionNameRequest,
} from '../../shared/types/console.js';

/**
 * Single-user constant
 * All sessions belong to this user, enabling cross-device session sharing
 */
const SINGLE_USER = 'default';

const router = Router();

/**
 * List all sessions
 * GET /api/console/sessions
 */
router.get('/sessions', (_req: Request, res: Response) => {
  void (async (): Promise<void> => {
    try {
      const response = await consoleService.listSessions(SINGLE_USER);
      res.json(response);
    } catch (error) {
      logger.error('Failed to list console sessions:', error);
      res.status(500).json({
        error: {
          message: 'Failed to list terminal sessions',
          code: 'SESSION_LIST_FAILED',
        },
      });
    }
  })();
});

/**
 * Create a new session
 * POST /api/console/sessions
 */
router.post('/sessions', (req: Request, res: Response) => {
  void (async (): Promise<void> => {
    try {
      const request = req.body as CreateSessionRequest;
      const session = await consoleService.createSession(SINGLE_USER, request);
      const response: CreateSessionResponse = { session };
      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create console session:', error);
      res.status(500).json({
        error: {
          message: 'Failed to create terminal session',
          code: 'SESSION_CREATE_FAILED',
        },
      });
    }
  })();
});

/**
 * Get session details
 * GET /api/console/sessions/:id
 */
router.get('/sessions/:id', (req: Request, res: Response) => {
  void (async (): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const result = await consoleService.validateSession(SINGLE_USER, sessionId);

      if (!result.valid || !result.session) {
        res.status(404).json({
          error: {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
        return;
      }

      res.json(result.session);
    } catch (error) {
      logger.error('Failed to get console session:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get terminal session',
          code: 'SESSION_GET_FAILED',
        },
      });
    }
  })();
});

/**
 * Delete a session
 * DELETE /api/console/sessions/:id
 */
router.delete('/sessions/:id', (req: Request, res: Response) => {
  void (async (): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const success = await consoleService.destroySession(SINGLE_USER, sessionId);

      if (!success) {
        res.status(404).json({
          error: {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete console session:', error);
      res.status(500).json({
        error: {
          message: 'Failed to delete terminal session',
          code: 'SESSION_DELETE_FAILED',
        },
      });
    }
  })();
});

/**
 * Get current working directory for a session
 * GET /api/console/sessions/:id/cwd
 */
router.get('/sessions/:id/cwd', (req: Request, res: Response) => {
  void (async (): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const result = await consoleService.getSessionCwd(SINGLE_USER, sessionId);

      if (!result) {
        res.status(404).json({
          error: {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Failed to get session cwd:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get session working directory',
          code: 'SESSION_CWD_FAILED',
        },
      });
    }
  })();
});

/**
 * Update session custom name
 * PATCH /api/console/sessions/:id/name
 */
router.patch('/sessions/:id/name', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { name } = req.body as UpdateSessionNameRequest;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        error: {
          message: 'Invalid request: name is required',
          code: 'INVALID_REQUEST',
        },
      });
      return;
    }

    const success = consoleService.updateSessionName(SINGLE_USER, sessionId, name);

    if (!success) {
      res.status(404).json({
        error: {
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        },
      });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to update session name:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update session name',
        code: 'SESSION_UPDATE_FAILED',
      },
    });
  }
});

export { router as consoleRouter };
