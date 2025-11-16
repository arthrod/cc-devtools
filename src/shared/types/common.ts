/**
 * Generic utility types
 */

/**
 * Generic type to add search score and match reason to any base type
 */
// @type-duplicate-allowed
export type WithScore<T> = T & {
  score: number;
  match_reason: string;
}

/**
 * Generic error type for safe error handling
 */
export interface ErrorWithCode {
  message: string;
  code?: string;
  stack?: string;
  [key: string]: unknown;
}
