// src/lib/errors.ts

import { ErrorCodes } from './types/errors.js';

import type { ErrorCode, ErrorDetails } from './types/errors.js';

export class CCDevToolsError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly originalError?: Error;

  constructor(errorDetails: ErrorDetails) {
    super(errorDetails.message);
    this.name = 'CCDevToolsError';
    this.code = errorDetails.code;
    this.details = errorDetails.details;
    this.originalError = errorDetails.originalError;

    // Don't include stack trace for expected errors
    const expectedErrors: ErrorCode[] = [
      ErrorCodes.VALIDATION_FAILED,
      ErrorCodes.NOT_FOUND,
      ErrorCodes.INVALID_INPUT,
      ErrorCodes.LOCKED,
      ErrorCodes.ALREADY_EXISTS,
    ];

    if (expectedErrors.includes(this.code)) {
      this.stack = undefined;
    }
  }
}

// Factory functions for common errors
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): CCDevToolsError {
  return new CCDevToolsError({
    code: ErrorCodes.VALIDATION_FAILED,
    message,
    details,
  });
}

export function createInvalidInputError(
  message: string,
  details?: Record<string, unknown>
): CCDevToolsError {
  return new CCDevToolsError({
    code: ErrorCodes.INVALID_INPUT,
    message,
    details,
  });
}

export function createNotFoundError(
  message: string,
  details?: Record<string, unknown>
): CCDevToolsError {
  return new CCDevToolsError({
    code: ErrorCodes.NOT_FOUND,
    message,
    details,
  });
}

export function createFileError(message: string, originalError: Error): CCDevToolsError {
  return new CCDevToolsError({
    code: ErrorCodes.FILE_ERROR,
    message,
    originalError,
  });
}

export function createAlreadyExistsError(
  message: string,
  details?: Record<string, unknown>
): CCDevToolsError {
  return new CCDevToolsError({
    code: ErrorCodes.ALREADY_EXISTS,
    message,
    details,
  });
}

// Type guard
export function isCCDevToolsError(error: unknown): error is CCDevToolsError {
  return error instanceof CCDevToolsError;
}
