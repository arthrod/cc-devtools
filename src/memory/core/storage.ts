/**
 * File storage for memories and embeddings
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

import * as yaml from 'js-yaml';
import { pack, unpack } from 'msgpackr';

import type { Memory, EmbeddingCache } from '../types.js';

import { createFileError } from '../../shared/errors.js';

// Get paths at runtime to support process.chdir() in tests
function getMemoryFile(): string {
  return join(process.cwd(), 'cc-devtools', 'memory.yaml');
}

function getEmbeddingsFile(): string {
  return join(process.cwd(), 'cc-devtools', '.cache', 'memory-embeddings.msgpack');
}

interface MemoryYAML {
  memories: Memory[];
}

/**
 * Ensure necessary directories exist
 */
function ensureDir(): void {
  const memoryDir = dirname(getMemoryFile());
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }

  const cacheDir = dirname(getEmbeddingsFile());
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Read memories from YAML file
 */
export function readMemories(): Memory[] {
  if (!existsSync(getMemoryFile())) {
    return [];
  }

  ensureDir();

  try {
    const content = readFileSync(getMemoryFile(), 'utf-8');
    const data = yaml.load(content) as MemoryYAML | null;

    if (!data?.memories || !Array.isArray(data.memories)) {
      return [];
    }

    return data.memories.map(m => ({
      id: String(m.id),
      summary: String(m.summary),
      details: String(m.details),
      tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
      created_at: Number(m.created_at)
    }));
  } catch (error) {
    throw createFileError(`Failed to read ${getMemoryFile()}`, error as Error);
  }
}

/**
 * Save memories to YAML file
 */
export function saveMemories(memories: Memory[]): void {
  ensureDir();

  try {
    const data: MemoryYAML = { memories };
    const content = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });

    writeFileSync(getMemoryFile(), content, 'utf-8');
  } catch (error) {
    throw createFileError(`Failed to save ${getMemoryFile()}`, error as Error);
  }
}

/**
 * Read embeddings from cache file
 */
export function readEmbeddings(): EmbeddingCache {
  if (!existsSync(getEmbeddingsFile())) {
    return {};
  }

  ensureDir();

  try {
    const buffer = readFileSync(getEmbeddingsFile());
    return unpack(buffer) as EmbeddingCache;
  } catch (_error) {
    return {};
  }
}

/**
 * Save embeddings to cache file
 */
export function saveEmbeddings(embeddings: EmbeddingCache): void {
  ensureDir();

  try {
    const packed = pack(embeddings);
    writeFileSync(getEmbeddingsFile(), packed);
  } catch (error) {
    throw createFileError(`Failed to save ${getEmbeddingsFile()}`, error as Error);
  }
}
