/**
 * Kanban embeddings storage using MessagePack for efficient serialization
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

import { pack, unpack } from 'msgpackr';

import { createFileError } from '../../shared/errors.js';

import type { EmbeddingCache } from '../../shared/types/search.js';

/**
 * Get the embeddings file path
 * Stored in the user's project at cc-devtools/.cache/kanban-embeddings.msgpack
 */
function getEmbeddingsFilePath(): string {
  return join(process.cwd(), 'cc-devtools', '.cache', 'kanban-embeddings.msgpack');
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  const cacheDir = dirname(getEmbeddingsFilePath());
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Read embeddings from storage
 */
export function readEmbeddings(): EmbeddingCache {
  const embeddingsFile = getEmbeddingsFilePath();

  try {
    if (!existsSync(embeddingsFile)) {
      return {};
    }

    const buffer = readFileSync(embeddingsFile);
    return unpack(buffer) as EmbeddingCache;
  } catch (error) {
    throw createFileError(`Failed to read ${embeddingsFile}`, error as Error);
  }
}

/**
 * Save embeddings to storage
 */
export function saveEmbeddings(embeddings: EmbeddingCache): void {
  const embeddingsFile = getEmbeddingsFilePath();

  try {
    ensureCacheDir();
    const packed = pack(embeddings);
    writeFileSync(embeddingsFile, packed);
  } catch (error) {
    throw createFileError(`Failed to write ${embeddingsFile}`, error as Error);
  }
}
