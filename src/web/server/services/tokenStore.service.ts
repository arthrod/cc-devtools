/**
 * Token storage service
 * Persists valid authentication tokens locally using msgpack
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

import { pack, unpack } from 'msgpackr';

import * as logger from '../utils/logger.js';

interface TokenData {
  token: string;
  firstUsed: number;
  lastUsed: number;
}

interface TokenStorage {
  tokens: TokenData[];
  version: number;
}

export class TokenStore {
  private validTokens: Set<string> = new Set();
  private tokenData: Map<string, TokenData> = new Map();
  private storagePath: string;
  private currentToken: string;

  constructor(storagePath: string, currentToken: string) {
    this.storagePath = storagePath;
    this.currentToken = currentToken;

    // Add current token to valid set
    this.validTokens.add(currentToken);
  }

  /**
   * Load tokens from disk
   */
  async load(): Promise<void> {
    if (!existsSync(this.storagePath)) {
      logger.debug('No stored tokens found');
      return;
    }

    try {
      const data = await readFile(this.storagePath);
      const storage = unpack(data) as TokenStorage;

      for (const tokenData of storage.tokens) {
        this.validTokens.add(tokenData.token);
        this.tokenData.set(tokenData.token, tokenData);
      }

      logger.info(`📦 Loaded ${storage.tokens.length} stored token(s)`);
    } catch (error) {
      logger.error('Failed to load stored tokens:', error);
    }
  }

  /**
   * Save tokens to disk
   */
  private async save(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = join(this.storagePath, '..');
      await mkdir(dir, { recursive: true });

      const storage: TokenStorage = {
        version: 1,
        tokens: Array.from(this.tokenData.values()),
      };

      const packed = pack(storage);
      await writeFile(this.storagePath, packed);

      logger.debug('Tokens saved to disk');
    } catch (error) {
      logger.error('Failed to save tokens:', error);
    }
  }

  /**
   * Check if token is valid
   */
  isValid(token: string): boolean {
    return this.validTokens.has(token);
  }

  /**
   * Mark token as used (will be persisted)
   */
  async markUsed(token: string): Promise<void> {
    if (!this.validTokens.has(token)) {
      return;
    }

    const now = Date.now();
    const existing = this.tokenData.get(token);

    if (existing) {
      // Update last used time
      existing.lastUsed = now;
    } else {
      // First use - add to storage
      this.tokenData.set(token, {
        token,
        firstUsed: now,
        lastUsed: now,
      });

      logger.info(`🔐 Token persisted (first use)`);
    }

    await this.save();
  }

  /**
   * Invalidate all tokens
   */
  async invalidateAll(): Promise<void> {
    this.validTokens.clear();
    this.tokenData.clear();

    // Add current token back
    this.validTokens.add(this.currentToken);

    // Delete storage file
    try {
      if (existsSync(this.storagePath)) {
        await unlink(this.storagePath);
        logger.info('🗑️  All stored tokens invalidated');
      }
    } catch (error) {
      logger.error('Failed to delete token storage:', error);
    }
  }

  /**
   * Get token statistics
   */
  getStats(): { total: number; persisted: number } {
    return {
      total: this.validTokens.size,
      persisted: this.tokenData.size,
    };
  }

  /**
   * Get current session token
   */
  getCurrentToken(): string {
    return this.currentToken;
  }
}
