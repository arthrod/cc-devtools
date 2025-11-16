/**
 * Common CLI utility types
 */

/**
 * Feature validation result
 */
export interface FeatureValidationResult {
  valid: string[];
  invalid: string[];
  suggestions: Record<string, string | null>;
}
