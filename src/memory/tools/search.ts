/**
 * Memory search tool implementation
 */

import { readMemories } from '../core/storage.js';
import { searchMemories } from '../services/search.js';
import type { SearchResponse, SearchParams } from '../types.js';

import { createValidationError } from '../../shared/errors.js';

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 20;

/**
 * Search for memories
 */
export async function search(params: SearchParams): Promise<SearchResponse> {
  const { query, limit = DEFAULT_LIMIT } = params;

  if (typeof query !== 'string') {
    throw createValidationError('Query must be a string');
  }

  const actualLimit = Math.min(
    Math.max(1, typeof limit === 'number' ? limit : DEFAULT_LIMIT),
    MAX_LIMIT
  );

  const memories = readMemories();
  const results = await searchMemories(query, memories, actualLimit);

  return {
    success: true,
    results
  };
}
