/**
 * Shared CLI command types
 */

import type { BaseResponse } from '../shared/types/responses.js';

/**
 * Options for setup and add-feature commands
 */
export interface FeatureCommandOptions {
  features?: string[];
  slashCommands?: boolean;
}

export interface SetupOptions extends FeatureCommandOptions {
  gitignore?: boolean;
  mcp?: boolean;
}

/**
 * Parsed command-line arguments
 */
export interface ParsedArgs {
  command: string | null;
  positional: string[];
  options: Record<string, string | boolean>;
}

/**
 * JSON parsing result
 */
export interface JSONParseResult<T = unknown> extends BaseResponse {
  data?: T;
}

/**
 * Validation result
 */
// @type-duplicate-allowed
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Success response
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  command: string;
  data: T;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  command: string;
  error: string;
  code: string;
  stack?: string;
  [key: string]: unknown;
}

/**
 * CLI response (success or error)
 */
export type CLIResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;
