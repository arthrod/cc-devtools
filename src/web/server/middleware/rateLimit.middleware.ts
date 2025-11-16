/**
 * Rate limiting middleware
 * Prevents brute force authentication attacks
 */

import * as logger from '../utils/logger.js';

import type { RateLimitConfig } from '../../shared/types.js';
import type { Request, Response, NextFunction } from 'express';



/**
 * Track failed authentication attempts per IP
 */
interface RateLimitStore {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

/**
 * In-memory store for rate limiting
 */
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Clean up expired entries from store
 */
function cleanupStore(windowMs: number): void {
  const now = Date.now();

  for (const [ip, data] of rateLimitStore.entries()) {
    // Remove if outside window and not blocked
    if (now - data.firstAttempt > windowMs && !data.blockedUntil) {
      rateLimitStore.delete(ip);
    }

    // Remove if block has expired
    if (data.blockedUntil && now > data.blockedUntil) {
      rateLimitStore.delete(ip);
    }
  }
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(
  config: RateLimitConfig
): (req: Request, res: Response, next: NextFunction) => void {
  // Clean up store periodically
  setInterval(() => cleanupStore(config.windowMs), config.windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();

    // Get or create rate limit data for this IP
    let rateLimitData = rateLimitStore.get(clientIP);

    if (!rateLimitData) {
      rateLimitData = {
        attempts: 0,
        firstAttempt: now,
      };
      rateLimitStore.set(clientIP, rateLimitData);
    }

    // Check if IP is currently blocked
    if (rateLimitData.blockedUntil) {
      if (now < rateLimitData.blockedUntil) {
        const remainingMs = rateLimitData.blockedUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);

        res.status(429).json({
          error: {
            message: `Too many authentication attempts. Please try again in ${remainingMinutes} minute(s).`,
            code: 'RATE_LIMIT_EXCEEDED',
          },
        });
        return;
      }

      // Block has expired, reset
      rateLimitStore.delete(clientIP);
      rateLimitData = {
        attempts: 0,
        firstAttempt: now,
      };
      rateLimitStore.set(clientIP, rateLimitData);
    }

    // Reset window if it has expired
    if (now - rateLimitData.firstAttempt > config.windowMs) {
      rateLimitData.attempts = 0;
      rateLimitData.firstAttempt = now;
    }

    // Intercept response to track failed auth attempts
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      // Check if this is an authentication failure (401)
      if (res.statusCode === 401 && rateLimitData) {
        rateLimitData.attempts += 1;

        // Block if max attempts exceeded
        if (rateLimitData.attempts >= config.maxAttempts) {
          rateLimitData.blockedUntil = now + config.windowMs;

          logger.warn(
            `🚫 Rate limit exceeded for IP ${clientIP}. Blocked for ${config.windowMs / 60000} minutes.`
          );

          return originalJson({
            error: {
              message: `Too many authentication attempts. Blocked for ${config.windowMs / 60000} minute(s).`,
              code: 'RATE_LIMIT_EXCEEDED',
            },
          });
        }

        const remainingAttempts = config.maxAttempts - rateLimitData.attempts;

        logger.warn(
          `⚠️  Failed auth attempt from ${clientIP}. ${remainingAttempts} attempts remaining.`
        );
      }

      // Reset attempts on successful authentication (200-299)
      if (res.statusCode >= 200 && res.statusCode < 300 && rateLimitData) {
        rateLimitStore.delete(clientIP);
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Get current rate limit status for an IP (for debugging)
 */
export function getRateLimitStatus(ip: string): RateLimitStore | null {
  return rateLimitStore.get(ip) ?? null;
}

/**
 * Clear rate limit for an IP (for debugging/admin)
 */
export function clearRateLimit(ip: string): boolean {
  return rateLimitStore.delete(ip);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
