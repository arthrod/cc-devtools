/**
 * Index storage using MessagePack for efficient serialization
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

import { pack, unpack } from 'msgpackr';

import type { Index, SymbolInfo, Import } from '../types.js';

import { withLock } from '../../shared/file-lock.js';


const INDEX_VERSION = '1.0.0';

interface SerializedIndex {
  version: string;
  indexedAt: number;
  fileCount: number;
  symbolCount: number;
  symbols: Array<[string, SymbolInfo[]]>;
  imports: Array<[string, Import[]]>;
  embeddings: Array<[string, number[]]>;
}

export async function saveIndex(index: Index, indexPath: string): Promise<void> {
  await withLock(indexPath, () => {
    const serialized: SerializedIndex = {
      version: INDEX_VERSION,
      indexedAt: index.metadata.indexedAt,
      fileCount: index.metadata.fileCount,
      symbolCount: index.metadata.symbolCount,
      symbols: Array.from(index.symbols.entries()),
      imports: Array.from(index.imports.entries()),
      embeddings: Array.from(index.embeddings.entries()).map(([key, embedding]) => [
        key,
        Array.from(embedding)
      ])
    };

    const packed = pack(serialized);
    writeFileSync(indexPath, packed);
  });
}

export async function loadIndex(indexPath: string): Promise<Index | null> {
  if (!existsSync(indexPath)) {
    return null;
  }

  try {
    return await withLock(indexPath, () => {
      const buffer = readFileSync(indexPath);
      const serialized = unpack(buffer) as SerializedIndex;

      if (serialized.version !== INDEX_VERSION) {
        return null;
      }

      const index: Index = {
        symbols: new Map(serialized.symbols),
        imports: new Map(serialized.imports),
        embeddings: new Map(
          serialized.embeddings.map(([key, embedding]) => [
            key,
            new Float32Array(embedding)
          ])
        ),
        metadata: {
          version: serialized.version,
          indexedAt: serialized.indexedAt,
          fileCount: serialized.fileCount,
          symbolCount: serialized.symbolCount
        }
      };

      return index;
    });
  } catch {
    return null;
  }
}

export function createEmptyIndex(): Index {
  return {
    symbols: new Map(),
    imports: new Map(),
    embeddings: new Map(),
    metadata: {
      version: INDEX_VERSION,
      indexedAt: Date.now(),
      fileCount: 0,
      symbolCount: 0
    }
  };
}
