/**
 * Authentication middleware
 * Validates Bearer token in Authorization header
 */

import type { TokenStore } from '../types.js';

import type { AuthContext } from '../../shared/types.js';
import type { Request, Response, NextFunction } from 'express';




/**
 * Extend Express Request to include auth context
 */
declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(tokenStore: TokenStore) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const clientIP = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    // Check if Authorization header exists
    if (!authHeader) {
      res.status(401).json({
        error: {
          message: 'Missing Authorization header',
          code: 'AUTH_MISSING',
        },
      });
      return;
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          message: 'Invalid Authorization header format. Expected: Bearer <token>',
          code: 'AUTH_INVALID_FORMAT',
        },
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token
    if (!tokenStore.isValid(token)) {
      res.status(401).json({
        error: {
          message: 'Invalid authentication token',
          code: 'AUTH_INVALID_TOKEN',
        },
      });
      return;
    }

    // Mark token as used (will persist on first use)
    void tokenStore.markUsed(token);

    // Attach auth context to request
    req.auth = {
      authenticated: true,
      ip: clientIP,
    };

    next();
  };
}

/**
 * Optional authentication middleware
 * Allows requests without token but marks them as unauthenticated
 */
export function createOptionalAuthMiddleware(tokenStore: TokenStore) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.auth = {
        authenticated: false,
        ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      };
      next();
      return;
    }

    const token = authHeader.substring(7);
    const isValid = tokenStore.isValid(token);

    if (isValid) {
      void tokenStore.markUsed(token);
    }

    req.auth = {
      authenticated: isValid,
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    };

    next();
  };
}

/**
 * SSE-compatible authentication middleware
 * Supports both Authorization header and query parameter token (for EventSource)
 */
export function createSSEAuthMiddleware(tokenStore: TokenStore) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    // First check for token in query parameter (EventSource limitation)
    const tokenFromQuery = req.query.token as string | undefined;

    if (tokenFromQuery && tokenStore.isValid(tokenFromQuery)) {
      // Valid token in query, proceed
      void tokenStore.markUsed(tokenFromQuery);
      req.auth = {
        authenticated: true,
        ip: clientIP,
      };
      next();
      return;
    }

    // Fall back to header-based auth
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: {
          message: 'Missing Authorization header or token query parameter',
          code: 'AUTH_MISSING',
        },
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          message: 'Invalid Authorization header format. Expected: Bearer <token>',
          code: 'AUTH_INVALID_FORMAT',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!tokenStore.isValid(token)) {
      res.status(401).json({
        error: {
          message: 'Invalid authentication token',
          code: 'AUTH_INVALID_TOKEN',
        },
      });
      return;
    }

    void tokenStore.markUsed(token);

    req.auth = {
      authenticated: true,
      ip: clientIP,
    };

    next();
  };
}
