/**
 * IP Whitelist middleware
 * Validates that requests come from whitelisted IP addresses (CIDR ranges)
 */

import * as logger from '../utils/logger.js';

import type { CIDRParseResult } from '../../shared/types.js';
import type { Request, Response, NextFunction } from 'express';



/**
 * Parse CIDR notation (e.g., "192.168.0.0/16") into IP and prefix length
 */
function parseCIDR(cidr: string): CIDRParseResult | null {
  // Handle single IP (no CIDR notation)
  if (!cidr.includes('/')) {
    return { ip: cidr, prefixLength: 32 };
  }

  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return null;
  }

  const ip = parts[0];
  const prefixLength = parseInt(parts[1] ?? '', 10);

  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return null;
  }

  return { ip, prefixLength };
}

/**
 * Convert IP address string to 32-bit number
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');

  if (parts.length !== 4) {
    return null;
  }

  let result = 0;

  for (let i = 0; i < 4; i++) {
    const part = parseInt(parts[i] ?? '', 10);

    if (isNaN(part) || part < 0 || part > 255) {
      return null;
    }

    result += part << (24 - i * 8);
  }

  return result >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Check if an IP address matches a CIDR range
 */
export function ipMatchesCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr);

  if (!parsed) {
    logger.warn(`Invalid CIDR notation: ${cidr}`);
    return false;
  }

  const ipNum = ipToNumber(ip);
  const cidrIpNum = ipToNumber(parsed.ip);

  if (ipNum === null || cidrIpNum === null) {
    return false;
  }

  // Create mask from prefix length
  // e.g., /16 -> 11111111 11111111 00000000 00000000
  const mask = (0xffffffff << (32 - parsed.prefixLength)) >>> 0;

  // Compare network portions
  return (ipNum & mask) === (cidrIpNum & mask);
}

/**
 * Normalize IP address (handle IPv6-mapped IPv4 addresses)
 */
export function normalizeIP(ip: string): string {
  // Handle IPv6-mapped IPv4 (e.g., ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  // Handle ::1 (IPv6 localhost) -> 127.0.0.1
  if (ip === '::1') {
    return '127.0.0.1';
  }

  return ip;
}

/**
 * Create IP whitelist middleware
 */
export function createIPWhitelistMiddleware(whitelist: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = normalizeIP(
      req.ip ?? req.socket.remoteAddress ?? 'unknown'
    );

    // Check if IP is in whitelist
    const isWhitelisted = whitelist.some((cidr) => ipMatchesCIDR(clientIP, cidr));

    if (!isWhitelisted) {
      logger.warn(`🚫 Blocked request from non-whitelisted IP: ${clientIP}`);

      res.status(403).json({
        error: {
          message: 'Access forbidden: IP address not in whitelist',
          code: 'IP_NOT_WHITELISTED',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Validate CIDR notation strings
 */
export function validateCIDRList(cidrList: string[]): boolean {
  return cidrList.every((cidr) => {
    const parsed = parseCIDR(cidr);

    if (!parsed) {
      return false;
    }

    return ipToNumber(parsed.ip) !== null;
  });
}
