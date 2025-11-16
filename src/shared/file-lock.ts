/**
 * Generic file locking with exponential backoff retry
 * Prevents concurrent modifications to files across all modules
 */

import { existsSync, writeFileSync, unlinkSync, readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import type { LockData, LockOptions } from './types/locks.js';

const RETRY_DELAYS = [50, 100, 200, 400, 800, 1600]; // Exponential backoff in ms
const LOCK_STALE_MS = 5000; // Consider lock stale after 5 seconds

/**
 * Acquire lock for a file with retry
 * @param filePath - Path to file to lock
 * @param options - Options { timeout: ms }
 * @returns Lock file path
 * @throws Error if lock cannot be acquired
 */
export async function acquireLock(filePath: string, options: LockOptions = {}): Promise<string> {
  const lockPath = `${filePath}.lock`;
  const timeout = options.timeout ?? 5000;
  const startTime = Date.now();

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    // Check if we've exceeded timeout
    if (Date.now() - startTime > timeout) {
      throw new Error(`Lock timeout: Could not acquire lock for ${filePath}`);
    }

    // Try to acquire lock
    if (tryAcquire(lockPath)) {
      return lockPath;
    }

    // Check if lock is stale
    if (isLockStale(lockPath)) {
      // Remove stale lock and try again
      try {
        unlinkSync(lockPath);
      } catch {
        // Lock was removed by another process, continue
      }
      if (tryAcquire(lockPath)) {
        return lockPath;
      }
    }

    // Wait before retry with exponential backoff
    const delay = RETRY_DELAYS[attempt];
    await sleep(delay);
  }

  // Final attempt
  if (tryAcquire(lockPath)) {
    return lockPath;
  }

  throw new Error(`Lock timeout: Could not acquire lock for ${filePath}`);
}

/**
 * Release lock
 * @param lockPath - Path to lock file
 */
export function releaseLock(lockPath: string): void {
  try {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  } catch {
    // Lock already released or removed, ignore
  }
}

/**
 * Execute function with lock (acquire, run, release)
 * @param filePath - File to lock
 * @param fn - Function to run while locked (can be sync or async)
 * @returns Result of fn
 */
export async function withLock<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
  let lockPath: string | null = null;
  try {
    lockPath = await acquireLock(filePath);
    return await fn();
  } finally {
    if (lockPath) {
      releaseLock(lockPath);
    }
  }
}

/**
 * Try to acquire lock (non-blocking)
 * @param lockPath - Lock file path
 * @returns True if lock acquired
 */
function tryAcquire(lockPath: string): boolean {
  try {
    // Ensure parent directory exists
    const dir = dirname(lockPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Use 'wx' flag - write exclusive, fails if file exists
    const lockData: LockData = {
      pid: process.pid,
      timestamp: Date.now()
    };
    writeFileSync(lockPath, JSON.stringify(lockData), { flag: 'wx' });
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      return false; // Lock already exists
    }
    throw error; // Other errors
  }
}

/**
 * Check if lock file is stale
 * @param lockPath - Lock file path
 * @returns True if lock is stale
 */
function isLockStale(lockPath: string): boolean {
  try {
    if (!existsSync(lockPath)) {
      return false;
    }

    const content = readFileSync(lockPath, 'utf-8');
    const lockData = JSON.parse(content) as LockData;
    const age = Date.now() - lockData.timestamp;
    return age > LOCK_STALE_MS;
  } catch {
    // If we can't read lock file, consider it stale
    return true;
  }
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
