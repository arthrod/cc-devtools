#!/usr/bin/env node

/**
 * Source Code Mapper MCP Server
 * Provides intelligent code navigation and symbol search capabilities
 */


import { join } from 'path';

import { createMCPServer, startMCPServer } from '../shared/mcp-server-utils.js';

import { initializeModel } from './core/embeddings.js';
import { loadIndex, saveIndex, createEmptyIndex } from './core/storage.js';
import { scanAndIndexDirectory, updateIndexForFiles, validateAndSyncIndex } from './services/scanner.js';
import { createFileWatcher } from './services/watcher.js';
import { handleGetFileInfo } from './tools/get-file-info.js';
import { handleQueryImports } from './tools/query-imports.js';
import { handleSearchCode } from './tools/search-code.js';

import type { Index } from './types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Get paths (evaluated at runtime for test isolation)
 */
function getProjectRoot(): string {
  return process.cwd();
}

function getIndexPath(): string {
  return join(getProjectRoot(), 'cc-devtools', '.cache', 'source-code-index.msgpack');
}

let index: Index | null = null;
const indexingProgress = {
  isIndexing: false,
  progress: 0,
  total: 0
};

// Embeddings availability state with self-healing
const embeddingsState = {
  available: false,
  lastAttempt: 0,
  retryIntervalMs: 5 * 60 * 1000, // 5 minutes
};

async function tryInitializeEmbeddings(): Promise<boolean> {
  try {
    await initializeModel();
    embeddingsState.available = true;
    embeddingsState.lastAttempt = Date.now();
    return true;
  } catch {
    embeddingsState.available = false;
    embeddingsState.lastAttempt = Date.now();
    return false;
  }
}

async function ensureEmbeddingsAvailable(): Promise<boolean> {
  if (embeddingsState.available) {
    return true;
  }

  const timeSinceLastAttempt = Date.now() - embeddingsState.lastAttempt;
  if (timeSinceLastAttempt >= embeddingsState.retryIntervalMs) {
    return tryInitializeEmbeddings();
  }

  return false;
}

const SEARCH_CODE_TOOL: Tool = {
  name: 'search_code',
  description: 'Search for symbols (functions, classes, types, etc.) in the codebase. Supports exact, semantic, and fuzzy search modes.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search term (symbol name or semantic description)'
      },
      mode: {
        type: 'string',
        enum: ['exact', 'semantic', 'fuzzy'],
        description: 'Search mode (default: semantic)',
        default: 'semantic'
      },
      filters: {
        type: 'object',
        properties: {
          type: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['function', 'class', 'interface', 'type', 'const', 'enum']
            },
            description: 'Filter by symbol types'
          },
          exported_only: {
            type: 'boolean',
            description: 'Only return exported symbols'
          }
        }
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)',
        default: 10
      }
    },
    required: ['query']
  }
};

const QUERY_IMPORTS_TOOL: Tool = {
  name: 'query_imports',
  description: 'Query import graph information. Find all imports for a file or find all files importing a specific module.',
  inputSchema: {
    type: 'object',
    properties: {
      filepath: {
        type: 'string',
        description: 'Absolute path to get all imports for this file (e.g., /Users/name/project/src/file.ts)'
      },
      imported_module: {
        type: 'string',
        description: 'Find all files importing this module (can be relative like "./utils" or package name like "react")'
      }
    }
  }
};

const GET_FILE_INFO_TOOL: Tool = {
  name: 'get_file_info',
  description: 'Get complete information about a file including all symbols, imports, and exports.',
  inputSchema: {
    type: 'object',
    properties: {
      filepath: {
        type: 'string',
        description: 'Absolute path to the file to inspect (e.g., /Users/name/project/src/file.ts)'
      }
    },
    required: ['filepath']
  }
};


async function initialize(): Promise<void> {
  // Try to initialize embeddings (will enter degraded mode if fails)
  await tryInitializeEmbeddings();

  const indexPath = getIndexPath();
  const projectRoot = getProjectRoot();

  index = await loadIndex(indexPath);

  if (!index) {
    index = createEmptyIndex();
    indexingProgress.isIndexing = true;

    index = await scanAndIndexDirectory(projectRoot, (progress) => {
      indexingProgress.progress = progress.processedFiles;
      indexingProgress.total = progress.totalFiles;
    });

    indexingProgress.isIndexing = false;
    await saveIndex(index, indexPath);
  } else {
    try {
      await Promise.race([
        validateAndSyncIndex(index, projectRoot),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Index validation timeout')), 30000)
        )
      ]);
      await saveIndex(index, indexPath);
    } catch {
      // If validation times out or fails, use existing index as-is
    }
  }

  const watcher = createFileWatcher(projectRoot, (files) => {
    if (index) {
      void (async (): Promise<void> => {
        try {
          await updateIndexForFiles(index, files);
          await saveIndex(index, indexPath);
        } catch {
          // Silently fail file watcher updates
        }
      })();
    }
  });

  watcher.start();
}

async function main(): Promise<void> {
  // Register global error handlers
  process.on('unhandledRejection', () => {
    // Silently handle unhandled rejections
  });

  process.on('uncaughtException', () => {
    // Exit on uncaught exceptions
    process.exit(1);
  });

  const server = createMCPServer({
    name: 'cc-devtools-source-code-mapper',
    version: '0.1.0',
    tools: [SEARCH_CODE_TOOL, QUERY_IMPORTS_TOOL, GET_FILE_INFO_TOOL],
    handlers: {
      search_code: async (args) => {
        void ensureEmbeddingsAvailable();
        return handleSearchCode(
          index,
          indexingProgress,
          embeddingsState,
          args as unknown as Parameters<typeof handleSearchCode>[3]
        );
      },
      query_imports: (args) =>
        Promise.resolve(handleQueryImports(index, indexingProgress, args as unknown as Parameters<typeof handleQueryImports>[2])),
      get_file_info: (args) =>
        Promise.resolve(handleGetFileInfo(index, indexingProgress, args as unknown as Parameters<typeof handleGetFileInfo>[2])),
    },
  });

  await startMCPServer(server);

  initialize().catch(() => {
    embeddingsState.available = false;
    index = index ?? createEmptyIndex();
    indexingProgress.isIndexing = false;
  });
}

main().catch(() => {
  process.exit(1);
});
