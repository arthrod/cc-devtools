/**
 * Centralized logging utility for web server
 */

/* eslint-disable no-console */

import type { LogLevel } from '../../shared/types.js';

interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamps: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let config: LoggerConfig = {
  minLevel: 'info',
  enableTimestamps: true,
};

/**
 * Configure logger settings
 */
export function configureLogger(options: Partial<LoggerConfig>): void {
  config = { ...config, ...options };
}

/**
 * Format log message with timestamp
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = config.enableTimestamps
    ? `[${new Date().toISOString()}] `
    : '';

  const levelPrefix = level.toUpperCase().padEnd(5);

  return `${timestamp}${levelPrefix} ${message}`;
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Log debug message
 */
function debug(message: string, ...args: unknown[]): void {
  if (shouldLog('debug')) {
    console.debug(formatMessage('debug', message), ...args);
  }
}

/**
 * Log info message
 */
function info(message: string, ...args: unknown[]): void {
  if (shouldLog('info')) {
    console.log(formatMessage('info', message), ...args);
  }
}

/**
 * Log warning message
 */
function warn(message: string, ...args: unknown[]): void {
  if (shouldLog('warn')) {
    console.warn(formatMessage('warn', message), ...args);
  }
}

/**
 * Log error message
 */
function error(message: string, ...args: unknown[]): void {
  if (shouldLog('error')) {
    console.error(formatMessage('error', message), ...args);
  }
}

/**
 * Logger namespace object (exported as named exports)
 */
export { debug, info, warn, error, configureLogger as configure };

/**
 * Logger namespace for convenient imports
 * Use: import * as logger from './logger.js'
 */
