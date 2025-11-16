/**
 * Server types
 * Type definitions for server components
 */

/**
 * Token store interface
 * Manages authentication token validation and persistence
 */
export interface TokenStore {
  isValid(token: string): boolean;
  markUsed(token: string): Promise<void>;
  getCurrentToken(): string;
}
