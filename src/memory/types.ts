/**
 * Core memory type definitions
 */

import type { WithScore } from '../shared/types/common.js';
import type { StoreResponse, BaseResponse } from '../shared/types/responses.js';

export interface Memory {
  id: string;
  summary: string;
  details: string;
  tags: string[];
  created_at: number;
}

export interface MemoryWithEmbedding extends Memory {
  embedding: number[] | null;
}

export interface EmbeddingCache {
  [id: string]: number[] | null;
}

export type SearchResult = WithScore<Memory>;

export type { StoreResponse };

export interface SearchResponse extends BaseResponse {
  results?: SearchResult[];
}

/**
 * Store tool parameters
 */
export type StoreParams = Pick<Memory, 'summary' | 'details'> & Partial<Pick<Memory, 'tags'>>;

/**
 * Search tool parameters
 */
// @type-duplicate-allowed
export interface SearchParams {
  query: string;
  limit?: number;
}
