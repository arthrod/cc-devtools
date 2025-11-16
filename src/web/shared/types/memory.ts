/**
 * Shared types for Memory API
 * Used by both server and client
 */

export interface Memory {
  id: string;
  summary: string;
  details: string;
  tags: string[];
  created_at: number;
}

export interface MemorySearchResult extends Memory {
  score: number;
  match_reason: string;
}

/**
 * Memory search request parameters
 */
// @type-duplicate-allowed - Domain-specific type for Memory API, distinct from kanban SearchOptions
export interface MemorySearchParams {
  query: string;
  limit?: number;
}

/**
 * Memory search response
 */
export interface MemorySearchResponse {
  results: MemorySearchResult[];
}

/**
 * Memory store request parameters
 */
export interface MemoryStoreParams {
  summary: string;
  details: string;
  tags?: string[];
}

/**
 * Memory store response
 */
export interface MemoryStoreResponse {
  success: boolean;
  memory?: Memory;
  error?: string;
}
