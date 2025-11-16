/**
 * File scanner and indexer
 * Scans directories for source files and builds the symbol index
 */

import { existsSync, readFileSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

import ignore from 'ignore';

import { generateSymbolEmbedding } from '../core/embeddings.js';
import type { Index } from '../types.js';
import { STANDARD_IGNORE_PATTERNS } from '../types.js';

import { parseFile } from './parser.js';

/**
 * Check if a file is likely NOT a binary file
 * We'll try to parse all text files and only index those with actual code symbols
 */
function isPotentiallyTextFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();

  // Exclude binary and media files only
  const binaryExtensions = [
    // Executables
    '.exe', '.dll', '.so', '.dylib', '.bin', '.app',
    // Archives
    '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff',
    // Audio/Video
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac', '.ogg', '.mkv', '.webm',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Fonts
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    // Database
    '.db', '.sqlite', '.sqlite3',
    // Compiled
    '.pyc', '.class', '.o', '.obj', '.a', '.lib',
    // SVG (XML but often not code)
    '.svg',
  ];

  return !binaryExtensions.includes(ext);
}

interface ScanProgress {
  totalFiles: number;
  processedFiles: number;
  totalSymbols: number;
}

export async function scanAndIndexDirectory(
  directory: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<Index> {
  const files = await findSourceFiles(directory);
  const index: Index = {
    symbols: new Map(),
    imports: new Map(),
    embeddings: new Map(),
    metadata: {
      version: '1.0.0',
      indexedAt: Date.now(),
      fileCount: 0,
      symbolCount: 0
    }
  };

  const progress: ScanProgress = {
    totalFiles: files.length,
    processedFiles: 0,
    totalSymbols: 0
  };

  for (const file of files) {
    try {
      const parseResult = parseFile(file);

      if (parseResult.symbols.length > 0) {
        index.symbols.set(file, parseResult.symbols);

        for (const symbol of parseResult.symbols) {
          const embedding = await generateSymbolEmbedding(symbol);
          if (embedding) {
            const key = `${file}:${symbol.name}:${symbol.startLine}`;
            index.embeddings.set(key, new Float32Array(embedding));
          }
        }

        progress.totalSymbols += parseResult.symbols.length;
      }

      if (parseResult.imports.length > 0) {
        index.imports.set(file, parseResult.imports);
      }

      progress.processedFiles++;
      onProgress?.(progress);
    } catch {
      // Skip files that fail to index
    }
  }

  index.metadata.fileCount = index.symbols.size;
  index.metadata.symbolCount = progress.totalSymbols;

  return index;
}

export async function updateIndexForFiles(
  index: Index,
  files: string[]
): Promise<void> {
  let _successCount = 0;
  let _skippedCount = 0;
  let _errorCount = 0;

  for (const file of files) {
    try {
      index.symbols.delete(file);
      index.imports.delete(file);

      const keysToDelete: string[] = [];
      for (const key of index.embeddings.keys()) {
        if (key.startsWith(`${file}:`)) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        index.embeddings.delete(key);
      }

      if (existsSync(file)) {
        const parseResult = parseFile(file);

        if (parseResult.symbols.length > 0) {
          index.symbols.set(file, parseResult.symbols);

          for (const symbol of parseResult.symbols) {
            const embedding = await generateSymbolEmbedding(symbol);
            if (embedding) {
              const key = `${file}:${symbol.name}:${symbol.startLine}`;
              index.embeddings.set(key, new Float32Array(embedding));
            }
          }
          _successCount++;
        } else {
          _skippedCount++;
        }

        if (parseResult.imports.length > 0) {
          index.imports.set(file, parseResult.imports);
        }
      }
    } catch {
      _errorCount++;
      // Skip files that fail to update
    }
  }

  let totalSymbols = 0;
  for (const symbols of index.symbols.values()) {
    totalSymbols += symbols.length;
  }

  index.metadata.fileCount = index.symbols.size;
  index.metadata.symbolCount = totalSymbols;
  index.metadata.indexedAt = Date.now();
}

/**
 * Validate and sync index with filesystem
 * - Remove entries for deleted files
 * - Add entries for new files
 * - Update entries for modified files
 * Should be called on startup to sync stale index
 */
export async function validateAndSyncIndex(
  index: Index,
  projectRoot: string
): Promise<void> {
  const filesToUpdate: string[] = [];
  const indexedAt = index.metadata.indexedAt;

  // 1. Check for deleted files
  for (const file of index.symbols.keys()) {
    if (!existsSync(file)) {
      filesToUpdate.push(file);
    }
  }

  for (const file of index.imports.keys()) {
    if (!existsSync(file) && !filesToUpdate.includes(file)) {
      filesToUpdate.push(file);
    }
  }

  // 2. Scan for new and modified files
  const currentFiles = await findSourceFiles(projectRoot);
  const indexedFiles = new Set(index.symbols.keys());

  for (const file of currentFiles) {
    // New file - not in index
    if (!indexedFiles.has(file)) {
      filesToUpdate.push(file);
      continue;
    }

    // Modified file - check mtime
    try {
      const stats = await stat(file);
      if (stats.mtimeMs > indexedAt) {
        filesToUpdate.push(file);
      }
    } catch {
      // If we can't stat the file, skip it
    }
  }

  // 3. Update all changed files
  if (filesToUpdate.length > 0) {
    await updateIndexForFiles(index, filesToUpdate);
  }
}

async function findSourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  const ig = ignore().add(STANDARD_IGNORE_PATTERNS);

  const gitignorePath = join(directory, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  }

  async function scan(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(directory, fullPath);

      if (ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        // Try all potentially text-based files (exclude only binaries)
        // We'll only index files where we actually find symbols/imports
        if (isPotentiallyTextFile(entry.name)) {
          const stats = await stat(fullPath);
          // Skip files larger than 1MB
          if (stats.size < 1024 * 1024) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  await scan(directory);

  return files;
}
