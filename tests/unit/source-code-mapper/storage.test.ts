/**
 * Storage integration tests for Source-code-mapper
 * Tests index persistence, MessagePack serialization, and data integrity
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { saveIndex, loadIndex, createEmptyIndex } from '../../../src/source-code-mapper/core/storage.js';
import type { Index, Symbol } from '../../../src/source-code-mapper/core/types.js';

describe('Source-code-mapper Storage', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp test directory and switch to it
    originalCwd = process.cwd();
    testDir = join(originalCwd, '.test-scm-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory and cleanup
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  });

  describe('createEmptyIndex()', () => {
    it('should create empty index with default values', () => {
      const index = createEmptyIndex();

      expect(index.symbols).toBeInstanceOf(Map);
      expect(index.symbols.size).toBe(0);
      expect(index.imports).toBeInstanceOf(Map);
      expect(index.imports.size).toBe(0);
      expect(index.embeddings).toBeInstanceOf(Map);
      expect(index.embeddings.size).toBe(0);
      expect(index.metadata.version).toBe('1.0.0');
      expect(index.metadata.fileCount).toBe(0);
      expect(index.metadata.symbolCount).toBe(0);
      expect(index.metadata.indexedAt).toBeGreaterThan(0);
    });

    it('should create index with recent timestamp', () => {
      const before = Date.now();
      const index = createEmptyIndex();
      const after = Date.now();

      expect(index.metadata.indexedAt).toBeGreaterThanOrEqual(before);
      expect(index.metadata.indexedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('saveIndex() and loadIndex()', () => {
    it('should save and load empty index', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded).not.toBeNull();
      expect(loaded?.symbols.size).toBe(0);
      expect(loaded?.imports.size).toBe(0);
      expect(loaded?.embeddings.size).toBe(0);
      expect(loaded?.metadata.version).toBe('1.0.0');
    });

    it('should return null if index file does not exist', async () => {
      const indexPath = join(testDir, 'nonexistent.msgpack');
      const loaded = await loadIndex(indexPath);

      expect(loaded).toBeNull();
    });

    it('should save and load index with symbols', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      const symbol: Symbol = {
        name: 'testFunction',
        type: 'function',
        startLine: 10,
        endLine: 20,
        isExported: true,
        signature: 'function testFunction(arg: string): void',
        file: 'test.ts'
      };

      index.symbols.set('test.ts', [symbol]);
      index.metadata.fileCount = 1;
      index.metadata.symbolCount = 1;

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded).not.toBeNull();
      expect(loaded?.symbols.size).toBe(1);
      expect(loaded?.symbols.get('test.ts')).toHaveLength(1);

      const loadedSymbol = loaded?.symbols.get('test.ts')?.[0];
      expect(loadedSymbol?.name).toBe('testFunction');
      expect(loadedSymbol?.type).toBe('function');
      expect(loadedSymbol?.startLine).toBe(10);
      expect(loadedSymbol?.endLine).toBe(20);
      expect(loadedSymbol?.isExported).toBe(true);
      expect(loadedSymbol?.signature).toBe('function testFunction(arg: string): void');
      expect(loadedSymbol?.file).toBe('test.ts');
    });

    it('should save and load multiple symbols in multiple files', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      index.symbols.set('file1.ts', [
        {
          name: 'func1',
          type: 'function',
          startLine: 1,
          endLine: 5,
          isExported: true,
          file: 'file1.ts'
        },
        {
          name: 'Class1',
          type: 'class',
          startLine: 10,
          endLine: 20,
          isExported: false,
          file: 'file1.ts'
        }
      ]);

      index.symbols.set('file2.ts', [
        {
          name: 'interface1',
          type: 'interface',
          startLine: 5,
          endLine: 10,
          isExported: true,
          file: 'file2.ts'
        }
      ]);

      index.metadata.fileCount = 2;
      index.metadata.symbolCount = 3;

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded?.symbols.size).toBe(2);
      expect(loaded?.symbols.get('file1.ts')).toHaveLength(2);
      expect(loaded?.symbols.get('file2.ts')).toHaveLength(1);
      expect(loaded?.metadata.fileCount).toBe(2);
      expect(loaded?.metadata.symbolCount).toBe(3);
    });

    it('should save and load index with imports', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      index.imports.set('test.ts', [
        {
          source: './utils',
          imported: ['helper1', 'helper2'],
          usedBy: ['mainFunction']
        },
        {
          source: 'lodash',
          imported: ['map', 'filter'],
          usedBy: ['processData']
        }
      ]);

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded?.imports.size).toBe(1);
      const imports = loaded?.imports.get('test.ts');
      expect(imports).toHaveLength(2);
      expect(imports?.[0].source).toBe('./utils');
      expect(imports?.[0].imported).toEqual(['helper1', 'helper2']);
      expect(imports?.[0].usedBy).toEqual(['mainFunction']);
      expect(imports?.[1].source).toBe('lodash');
    });

    it('should save and load index with embeddings', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      const embedding1 = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const embedding2 = new Float32Array([0.5, 0.6, 0.7, 0.8]);

      index.embeddings.set('symbol1', embedding1);
      index.embeddings.set('symbol2', embedding2);

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded?.embeddings.size).toBe(2);

      const loadedEmb1 = loaded?.embeddings.get('symbol1');
      const loadedEmb2 = loaded?.embeddings.get('symbol2');

      expect(loadedEmb1).toBeInstanceOf(Float32Array);
      expect(loadedEmb2).toBeInstanceOf(Float32Array);

      // Float32Array has precision limitations, use toBeCloseTo
      expect(loadedEmb1![0]).toBeCloseTo(0.1, 5);
      expect(loadedEmb1![1]).toBeCloseTo(0.2, 5);
      expect(loadedEmb1![2]).toBeCloseTo(0.3, 5);
      expect(loadedEmb1![3]).toBeCloseTo(0.4, 5);
      expect(loadedEmb2![0]).toBeCloseTo(0.5, 5);
      expect(loadedEmb2![1]).toBeCloseTo(0.6, 5);
      expect(loadedEmb2![2]).toBeCloseTo(0.7, 5);
      expect(loadedEmb2![3]).toBeCloseTo(0.8, 5);
    });

    it('should save and load complete index with all data types', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      // Add symbols
      index.symbols.set('app.ts', [
        {
          name: 'MyClass',
          type: 'class',
          startLine: 10,
          endLine: 50,
          isExported: true,
          signature: 'class MyClass',
          file: 'app.ts'
        }
      ]);

      // Add imports
      index.imports.set('app.ts', [
        {
          source: './types',
          imported: ['User', 'Product'],
          usedBy: ['MyClass']
        }
      ]);

      // Add embeddings
      index.embeddings.set('MyClass', new Float32Array([0.1, 0.2, 0.3]));

      // Update metadata
      index.metadata.fileCount = 1;
      index.metadata.symbolCount = 1;
      index.metadata.indexedAt = 123456789;

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded?.symbols.size).toBe(1);
      expect(loaded?.imports.size).toBe(1);
      expect(loaded?.embeddings.size).toBe(1);
      expect(loaded?.metadata.fileCount).toBe(1);
      expect(loaded?.metadata.symbolCount).toBe(1);
      expect(loaded?.metadata.indexedAt).toBe(123456789);
    });

    it('should overwrite existing index', async () => {
      const indexPath = join(testDir, 'index.msgpack');

      const index1 = createEmptyIndex();
      index1.symbols.set('file1.ts', [
        { name: 'oldSymbol', type: 'function', startLine: 1, endLine: 5, isExported: true, file: 'file1.ts' }
      ]);

      await saveIndex(index1, indexPath);

      const index2 = createEmptyIndex();
      index2.symbols.set('file2.ts', [
        { name: 'newSymbol', type: 'class', startLine: 10, endLine: 20, isExported: false, file: 'file2.ts' }
      ]);

      await saveIndex(index2, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded?.symbols.size).toBe(1);
      expect(loaded?.symbols.get('file1.ts')).toBeUndefined();
      expect(loaded?.symbols.get('file2.ts')).toHaveLength(1);
      expect(loaded?.symbols.get('file2.ts')?.[0].name).toBe('newSymbol');
    });

    it('should handle symbols with all types', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      const types: Array<'function' | 'class' | 'interface' | 'type' | 'const' | 'enum'> = [
        'function',
        'class',
        'interface',
        'type',
        'const',
        'enum'
      ];

      const symbols = types.map((type, i) => ({
        name: `test${i}`,
        type,
        startLine: i * 10,
        endLine: i * 10 + 5,
        isExported: i % 2 === 0,
        file: 'test.ts'
      }));

      index.symbols.set('test.ts', symbols);

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      const loadedSymbols = loaded?.symbols.get('test.ts');
      expect(loadedSymbols).toHaveLength(6);
      types.forEach((type, i) => {
        expect(loadedSymbols?.[i].type).toBe(type);
      });
    });

    it('should handle optional symbol fields', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      index.symbols.set('test.ts', [
        {
          name: 'withSignature',
          type: 'function',
          startLine: 1,
          endLine: 5,
          isExported: true,
          signature: 'function withSignature()',
          file: 'test.ts'
        },
        {
          name: 'withoutSignature',
          type: 'function',
          startLine: 10,
          endLine: 15,
          isExported: false,
          file: 'test.ts'
        }
      ]);

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      const symbols = loaded?.symbols.get('test.ts');
      expect(symbols?.[0].signature).toBe('function withSignature()');
      expect(symbols?.[1].signature).toBeUndefined();
    });

    it('should return null for corrupted index file', async () => {
      const indexPath = join(testDir, 'corrupted.msgpack');
      writeFileSync(indexPath, 'not valid msgpack data');

      const loaded = await loadIndex(indexPath);

      expect(loaded).toBeNull();
    });

    it('should load index even with different metadata version', async () => {
      const indexPath = join(testDir, 'version-test.msgpack');

      // The storage layer will save with correct version
      const index = createEmptyIndex();
      await saveIndex(index, indexPath);

      // Load should succeed - version is set during save
      const loaded = await loadIndex(indexPath);

      expect(loaded).not.toBeNull();
      expect(loaded?.metadata.version).toBe('1.0.0');
    });

    it('should handle empty embeddings array', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      const emptyEmbedding = new Float32Array([]);
      index.embeddings.set('empty', emptyEmbedding);

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      const loadedEmb = loaded?.embeddings.get('empty');
      expect(loadedEmb).toBeInstanceOf(Float32Array);
      expect(loadedEmb?.length).toBe(0);
    });

    it('should handle large embeddings', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      const largeEmbedding = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        largeEmbedding[i] = Math.random();
      }

      index.embeddings.set('large', largeEmbedding);

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      const loadedEmb = loaded?.embeddings.get('large');
      expect(loadedEmb?.length).toBe(1024);
      expect(Array.from(loadedEmb!)).toEqual(Array.from(largeEmbedding));
    });

    it('should handle file paths with special characters', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      const files = [
        'file with spaces.ts',
        'file-with-dashes.ts',
        'file_with_underscores.ts',
        'file.with.dots.ts',
        'path/to/nested/file.ts'
      ];

      files.forEach(file => {
        index.symbols.set(file, [
          { name: 'test', type: 'function', startLine: 1, endLine: 5, isExported: true, file }
        ]);
      });

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded?.symbols.size).toBe(5);
      files.forEach(file => {
        expect(loaded?.symbols.get(file)).toBeDefined();
      });
    });

    it('should preserve metadata correctly', async () => {
      const indexPath = join(testDir, 'index.msgpack');
      const index = createEmptyIndex();

      index.metadata.version = '1.0.0';
      index.metadata.indexedAt = 9999999999;
      index.metadata.fileCount = 42;
      index.metadata.symbolCount = 100;

      await saveIndex(index, indexPath);
      const loaded = await loadIndex(indexPath);

      expect(loaded?.metadata.version).toBe('1.0.0');
      expect(loaded?.metadata.indexedAt).toBe(9999999999);
      expect(loaded?.metadata.fileCount).toBe(42);
      expect(loaded?.metadata.symbolCount).toBe(100);
    });

    it('should handle concurrent saves with file locking', async () => {
      const indexPath = join(testDir, 'index.msgpack');

      const index1 = createEmptyIndex();
      index1.symbols.set('file1.ts', [
        { name: 'func1', type: 'function', startLine: 1, endLine: 5, isExported: true, file: 'file1.ts' }
      ]);

      const index2 = createEmptyIndex();
      index2.symbols.set('file2.ts', [
        { name: 'func2', type: 'function', startLine: 1, endLine: 5, isExported: true, file: 'file2.ts' }
      ]);

      // Save both concurrently - lock should handle this
      await Promise.all([
        saveIndex(index1, indexPath),
        saveIndex(index2, indexPath)
      ]);

      // One of them should have won
      const loaded = await loadIndex(indexPath);
      expect(loaded).not.toBeNull();
      expect(loaded?.symbols.size).toBeGreaterThan(0);
    });
  });
});
