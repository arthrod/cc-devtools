/**
 * MCP tool: search_code
 * Search for symbols in the codebase
 */

import { searchSymbols } from '../services/search.js';
import type { Index, SearchMode, SearchFilters } from '../types.js';

// @type-duplicate-allowed - Different domain from kanban SearchOptions, serves different purpose
interface SearchSymbolsParams {
  query: string;
  mode?: SearchMode;
  filters?: SearchFilters;
  limit?: number;
}

export async function handleSearchCode(
  index: Index | null,
  indexingProgress: { isIndexing: boolean; progress: number; total: number },
  embeddingsState: { available: boolean; lastAttempt: number; retryIntervalMs: number },
  params: SearchSymbolsParams
): Promise<Record<string, unknown>> {
  if (indexingProgress.isIndexing) {
    const percent = indexingProgress.total > 0
      ? Math.round((indexingProgress.progress / indexingProgress.total) * 100)
      : 0;
    return {
      success: false,
      error: `Indexing in progress: ${percent}% (${indexingProgress.progress}/${indexingProgress.total} files), try again in a few seconds`
    };
  }

  if (!index) {
    return {
      success: false,
      error: 'Index not initialized'
    };
  }

  const { query, mode = 'semantic', filters, limit = 10 } = params;

  if (!query) {
    return {
      success: false,
      error: 'Query parameter is required'
    };
  }

  // Check embeddings availability for semantic search
  if (mode === 'semantic' && !embeddingsState.available) {
    const nextRetryMinutes = Math.ceil(
      (embeddingsState.retryIntervalMs - (Date.now() - embeddingsState.lastAttempt)) / 60000
    );
    return {
      success: false,
      error: `Semantic search unavailable - embeddings model failed to load. Retrying in ${nextRetryMinutes} minutes. Use mode='exact' or mode='fuzzy' instead.`
    };
  }

  const results = await searchSymbols(index, query, mode, filters, limit);
  return {
    success: true,
    data: results
  };
}
