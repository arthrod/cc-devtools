/**
 * MCP tool: query_imports
 * Query import graph information
 */

import { getFileImports, findImporters } from '../services/imports.js';
import type { Index } from '../types.js';

interface QueryImportsParams {
  filepath?: string;
  imported_module?: string;
}

export function handleQueryImports(
  index: Index | null,
  indexingProgress: { isIndexing: boolean; progress: number; total: number },
  params: QueryImportsParams
): Record<string, unknown> {
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

  const { filepath, imported_module } = params;

  if (!filepath && !imported_module) {
    return {
      success: false,
      error: 'Either filepath or imported_module parameter is required'
    };
  }

  let result;

  if (filepath) {
    result = getFileImports(index, filepath);
    if (!result) {
      return {
        success: false,
        error: `No imports found for file: ${filepath}`
      };
    }
  } else if (imported_module) {
    result = findImporters(index, imported_module);
    if (Array.isArray(result) && result.length === 0) {
      return {
        success: false,
        error: `No files found importing: ${imported_module}`
      };
    }
  }

  return {
    success: true,
    data: result
  };
}
