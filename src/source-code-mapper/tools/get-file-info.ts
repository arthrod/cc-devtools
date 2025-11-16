/**
 * MCP tool: get_file_info
 * Get complete information about a file (symbols, imports, exports)
 */

import type { Index, FileInfo } from '../types.js';

interface GetFileInfoParams {
  filepath: string;
}

export function handleGetFileInfo(
  index: Index | null,
  indexingProgress: { isIndexing: boolean; progress: number; total: number },
  params: GetFileInfoParams
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

  const { filepath } = params;

  if (!filepath) {
    return {
      success: false,
      error: 'filepath parameter is required'
    };
  }

  const symbols = index.symbols.get(filepath) ?? [];
  const imports = index.imports.get(filepath) ?? [];

  const exports = symbols
    .filter(s => s.isExported)
    .map(s => s.name);

  const fileInfo: FileInfo = {
    file: filepath,
    symbols,
    imports,
    exports
  };

  return {
    success: true,
    data: fileInfo
  };
}
