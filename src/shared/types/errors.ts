/**
 * Error handling types
 */

export const ErrorCodes = {
  // Expected errors (no stack trace)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  LOCKED: 'LOCKED',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // System errors (include stack trace)
  FILE_ERROR: 'FILE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  originalError?: Error;
}
