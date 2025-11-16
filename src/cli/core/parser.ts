/**
 * Argument and JSON parsing utilities for CLI
 */

import type { ParsedArgs, JSONParseResult, ValidationResult } from '../types.js';

/**
 * Parse command-line arguments into structured format
 */
export function parseArgs(args: string[]): ParsedArgs {
  if (args.length === 0) {
    return { command: null, positional: [], options: {} };
  }

  const command = args[0];
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex > 2) {
        const key = arg.substring(2, equalIndex);
        const value = arg.substring(equalIndex + 1);
        options[key] = value;
      } else {
        const key = arg.substring(2);
        options[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, options };
}

/**
 * Parse JSON string argument
 */
export function parseJSON<T = unknown>(jsonString: string): JSONParseResult<T> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    const errorMsg = (error as Error).message;
    return {
      success: false,
      error: `Invalid JSON format: ${errorMsg}. Please ensure your JSON is properly formatted with correct quotes, brackets, and commas.`
    };
  }
}

/**
 * Get option value with default
 */
export function getOption<T = string | boolean>(
  options: Record<string, string | boolean>,
  key: string,
  defaultValue: T
): T {
  return (Object.prototype.hasOwnProperty.call(options, key) ? options[key] : defaultValue) as T;
}

/**
 * Validate required positional arguments
 */
export function validatePositionalArgs(
  positional: string[],
  minCount: number,
  usage: string
): ValidationResult {
  if (positional.length < minCount) {
    return {
      valid: false,
      error: `Missing required arguments. Usage: ${usage}`
    };
  }
  return { valid: true };
}
