/**
 * Standard response builders for unified CLI
 * Ensures consistent JSON output across all commands
 */

import type { SuccessResponse, ErrorResponse, CLIResponse } from '../types.js';

/**
 * Build a success response
 */
export function buildSuccess<T>(command: string, data: T): SuccessResponse<T> {
  return {
    success: true,
    command,
    data
  };
}

/**
 * Build an error response
 */
export function buildError(
  command: string,
  error: string | Error,
  code = 'UNKNOWN_ERROR',
  additionalData: Record<string, unknown> = {}
): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  const shouldIncludeStack = shouldIncludeStackTrace(code);

  const response: ErrorResponse = {
    success: false,
    command,
    error: errorMessage,
    code,
    ...additionalData
  };

  if (shouldIncludeStack && error instanceof Error && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Determine if stack trace should be included based on error type
 */
function shouldIncludeStackTrace(code: string): boolean {
  const expectedErrors = [
    'VALIDATION_FAILED',
    'NOT_FOUND',
    'INVALID_INPUT',
    'LOCKED'
  ];

  return !expectedErrors.includes(code);
}

/**
 * Output response to stdout and exit with appropriate code
 * Ensures stdout is fully flushed before exit (critical for large JSON when piped)
 */
export function outputAndExit(response: CLIResponse, pretty = false): never {
  const json = pretty ? JSON.stringify(response, null, 2) : JSON.stringify(response);
  const exitCode = response.success ? 0 : 1;

  // Use process.stdout.write() and wait for drain before exiting
  // This prevents truncation when output is piped and buffer is large
  if (!process.stdout.write(json + '\n')) {
    // If write returns false, buffer is full, wait for drain
    process.stdout.once('drain', () => {
      process.exit(exitCode);
    });
  } else {
    // Buffer has space, but still wait a tick to ensure flush
    process.nextTick(() => {
      process.exit(exitCode);
    });
  }

  // TypeScript never return type workaround
  return undefined as never;
}
