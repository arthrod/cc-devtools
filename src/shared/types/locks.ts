/**
 * File locking types
 */

export interface LockData {
  pid: number;
  timestamp: number;
}

export interface LockOptions {
  timeout?: number;
}
