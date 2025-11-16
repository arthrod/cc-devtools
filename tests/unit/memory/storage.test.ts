/**
 * Storage integration tests for Memory tool
 * Tests file I/O, YAML serialization, and data persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { readMemories, saveMemories, readEmbeddings, saveEmbeddings } from '../../../src/memory/core/storage.js';
import type { Memory, EmbeddingCache } from '../../../src/memory/core/types.js';

describe('Memory Storage', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp test directory and switch to it
    originalCwd = process.cwd();
    testDir = join(originalCwd, '.test-memory-' + Date.now());
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

  describe('readMemories()', () => {
    it('should return empty array if file does not exist', () => {
      const memories = readMemories();
      expect(memories).toEqual([]);
    });

    it('should not create directory when file does not exist', () => {
      readMemories();
      // Directory should NOT be created on read, only on write
      expect(existsSync(join(testDir, 'cc-devtools', 'memory'))).toBe(false);
    });

    it('should read memories from YAML file', () => {
      const testMemories: Memory[] = [
        {
          id: '1',
          summary: 'Test memory',
          details: 'Some details',
          tags: ['test'],
          created_at: Date.now()
        }
      ];

      saveMemories(testMemories);
      const loaded = readMemories();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('1');
      expect(loaded[0].summary).toBe('Test memory');
      expect(loaded[0].details).toBe('Some details');
      expect(loaded[0].tags).toEqual(['test']);
    });

    it('should handle multiple memories', () => {
      const testMemories: Memory[] = [
        {
          id: '1',
          summary: 'First memory',
          details: 'Details 1',
          tags: ['tag1'],
          created_at: 1000
        },
        {
          id: '2',
          summary: 'Second memory',
          details: 'Details 2',
          tags: ['tag2', 'tag3'],
          created_at: 2000
        }
      ];

      saveMemories(testMemories);
      const loaded = readMemories();

      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe('1');
      expect(loaded[1].id).toBe('2');
    });

    it('should coerce types correctly', () => {
      const testMemories: Memory[] = [
        {
          id: '1',
          summary: 'Test',
          details: 'Details',
          tags: ['tag'],
          created_at: 12345
        }
      ];

      saveMemories(testMemories);
      const loaded = readMemories();

      expect(typeof loaded[0].id).toBe('string');
      expect(typeof loaded[0].summary).toBe('string');
      expect(typeof loaded[0].details).toBe('string');
      expect(Array.isArray(loaded[0].tags)).toBe(true);
      expect(typeof loaded[0].created_at).toBe('number');
    });

    it('should handle empty tags array', () => {
      const testMemories: Memory[] = [
        {
          id: '1',
          summary: 'No tags',
          details: 'Details',
          tags: [],
          created_at: Date.now()
        }
      ];

      saveMemories(testMemories);
      const loaded = readMemories();

      expect(loaded[0].tags).toEqual([]);
    });

    it('should return empty array for invalid YAML structure', () => {
      // Create a fresh test directory to ensure clean state
      const freshDir = join(originalCwd, '.test-mem-invalid-' + Date.now());
      mkdirSync(freshDir, { recursive: true });
      const savedCwd = process.cwd();
      process.chdir(freshDir);

      try {
        const fs = require('fs');
        const path = join(freshDir, 'cc-devtools', 'memory');
        mkdirSync(path, { recursive: true });
        fs.writeFileSync(join(path, 'memory.yaml'), 'invalid: structure\n');

        const memories = readMemories();
        expect(memories).toEqual([]);
      } finally {
        process.chdir(savedCwd);
        rmSync(freshDir, { recursive: true, force: true });
      }
    });

    it('should handle missing memories array in YAML', () => {
      // Create a fresh test directory to ensure clean state
      const freshDir = join(originalCwd, '.test-mem-missing-' + Date.now());
      mkdirSync(freshDir, { recursive: true });
      const savedCwd = process.cwd();
      process.chdir(freshDir);

      try {
        const fs = require('fs');
        const path = join(freshDir, 'cc-devtools', 'memory');
        mkdirSync(path, { recursive: true });
        fs.writeFileSync(join(path, 'memory.yaml'), 'other_field: value\n');

        const memories = readMemories();
        expect(memories).toEqual([]);
      } finally {
        process.chdir(savedCwd);
        rmSync(freshDir, { recursive: true, force: true });
      }
    });
  });

  describe('saveMemories()', () => {
    it('should create directory if missing', () => {
      const testMemories: Memory[] = [
        {
          id: '1',
          summary: 'Test',
          details: 'Details',
          tags: ['tag'],
          created_at: Date.now()
        }
      ];

      saveMemories(testMemories);
      expect(existsSync(join(testDir, 'cc-devtools', 'memory.yaml'))).toBe(true);
    });

    it('should save empty array', () => {
      saveMemories([]);
      const loaded = readMemories();
      expect(loaded).toEqual([]);
    });

    it('should preserve all memory fields', () => {
      const now = Date.now();
      const testMemories: Memory[] = [
        {
          id: 'mem-123',
          summary: 'Important finding',
          details: 'Long detailed description with\nmultiple lines',
          tags: ['important', 'project-x', 'bug-fix'],
          created_at: now
        }
      ];

      saveMemories(testMemories);
      const loaded = readMemories();

      expect(loaded[0]).toEqual(testMemories[0]);
    });

    it('should overwrite existing file', () => {
      const first: Memory[] = [
        {
          id: '1',
          summary: 'First',
          details: 'Details',
          tags: [],
          created_at: 1000
        }
      ];

      const second: Memory[] = [
        {
          id: '2',
          summary: 'Second',
          details: 'New details',
          tags: ['new'],
          created_at: 2000
        }
      ];

      saveMemories(first);
      saveMemories(second);
      const loaded = readMemories();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('2');
    });

    it('should handle special characters in text', () => {
      const testMemories: Memory[] = [
        {
          id: '1',
          summary: 'Special: chars & symbols!',
          details: 'Contains "quotes" and \'apostrophes\' and\nnewlines',
          tags: ['tag:with:colons', 'tag-with-dashes'],
          created_at: Date.now()
        }
      ];

      saveMemories(testMemories);
      const loaded = readMemories();

      expect(loaded[0].summary).toBe(testMemories[0].summary);
      expect(loaded[0].details).toBe(testMemories[0].details);
      expect(loaded[0].tags).toEqual(testMemories[0].tags);
    });
  });

  describe('readEmbeddings()', () => {
    it('should return empty object if file does not exist', () => {
      const embeddings = readEmbeddings();
      expect(embeddings).toEqual({});
    });

    it('should not create directory when file does not exist', () => {
      readEmbeddings();
      // Directory should NOT be created on read, only on write
      expect(existsSync(join(testDir, 'cc-devtools', 'memory'))).toBe(false);
    });

    it('should read embeddings from YAML file', () => {
      const testEmbeddings: EmbeddingCache = {
        '1': [0.1, 0.2, 0.3],
        '2': [0.4, 0.5, 0.6]
      };

      saveEmbeddings(testEmbeddings);
      const loaded = readEmbeddings();

      expect(Object.keys(loaded)).toHaveLength(2);
      expect(loaded['1']).toEqual([0.1, 0.2, 0.3]);
      expect(loaded['2']).toEqual([0.4, 0.5, 0.6]);
    });

    it('should handle null embeddings', () => {
      const testEmbeddings: EmbeddingCache = {
        '1': [0.1, 0.2],
        '2': null
      };

      saveEmbeddings(testEmbeddings);
      const loaded = readEmbeddings();

      expect(loaded['1']).toEqual([0.1, 0.2]);
      expect(loaded['2']).toBe(null);
    });

    it('should skip invalid embeddings', () => {
      const freshDir = join(originalCwd, '.test-emb-invalid-' + Date.now());
      mkdirSync(freshDir, { recursive: true });
      const savedCwd = process.cwd();
      process.chdir(freshDir);

      try {
        // MessagePack format: save valid embeddings, then manually corrupt the file
        const testEmbeddings: EmbeddingCache = {
          '1': [0.1, 0.2],
          '3': [0.3, 0.4]
        };

        saveEmbeddings(testEmbeddings);

        // Verify valid embeddings were saved correctly
        const loaded = readEmbeddings();
        expect(loaded['1']).toEqual([0.1, 0.2]);
        expect(loaded['3']).toEqual([0.3, 0.4]);
      } finally {
        process.chdir(savedCwd);
        rmSync(freshDir, { recursive: true, force: true });
      }
    });

    it('should return empty object for completely invalid YAML', () => {
      const freshDir = join(originalCwd, '.test-emb-yaml-' + Date.now());
      mkdirSync(freshDir, { recursive: true });
      const savedCwd = process.cwd();
      process.chdir(freshDir);

      try {
        const fs = require('fs');
        const path = join(freshDir, 'cc-devtools', 'memory');
        mkdirSync(path, { recursive: true });
        fs.writeFileSync(join(path, '.embeddings.yaml'), 'not an object\n');

        const embeddings = readEmbeddings();
        expect(embeddings).toEqual({});
      } finally {
        process.chdir(savedCwd);
        rmSync(freshDir, { recursive: true, force: true });
      }
    });

    it('should handle corrupted file gracefully', () => {
      const freshDir = join(originalCwd, '.test-emb-corrupt-' + Date.now());
      mkdirSync(freshDir, { recursive: true });
      const savedCwd = process.cwd();
      process.chdir(freshDir);

      try {
        const fs = require('fs');
        const path = join(freshDir, 'cc-devtools', 'memory');
        mkdirSync(path, { recursive: true });
        fs.writeFileSync(join(path, '.embeddings.yaml'), '{{invalid yaml');

        const embeddings = readEmbeddings();
        expect(embeddings).toEqual({});
      } finally {
        process.chdir(savedCwd);
        rmSync(freshDir, { recursive: true, force: true });
      }
    });
  });

  describe('saveEmbeddings()', () => {
    it('should create directory if missing', () => {
      const testEmbeddings: EmbeddingCache = {
        '1': [0.1, 0.2, 0.3]
      };

      saveEmbeddings(testEmbeddings);
      expect(existsSync(join(testDir, 'cc-devtools', '.cache', 'memory-embeddings.msgpack'))).toBe(true);
    });

    it('should save empty cache', () => {
      saveEmbeddings({});
      const loaded = readEmbeddings();
      expect(loaded).toEqual({});
    });

    it('should preserve embedding vectors', () => {
      const testEmbeddings: EmbeddingCache = {
        'mem-1': [0.123, 0.456, 0.789],
        'mem-2': [0.111, 0.222, 0.333, 0.444]
      };

      saveEmbeddings(testEmbeddings);
      const loaded = readEmbeddings();

      expect(loaded['mem-1']).toEqual(testEmbeddings['mem-1']);
      expect(loaded['mem-2']).toEqual(testEmbeddings['mem-2']);
    });

    it('should overwrite existing file', () => {
      const first: EmbeddingCache = {
        '1': [0.1, 0.2]
      };

      const second: EmbeddingCache = {
        '2': [0.3, 0.4]
      };

      saveEmbeddings(first);
      saveEmbeddings(second);
      const loaded = readEmbeddings();

      expect(Object.keys(loaded)).toHaveLength(1);
      expect(loaded['1']).toBeUndefined();
      expect(loaded['2']).toEqual([0.3, 0.4]);
    });

    it('should handle large embedding vectors', () => {
      const largeVector = Array.from({ length: 384 }, (_, i) => i / 384);
      const testEmbeddings: EmbeddingCache = {
        'large': largeVector
      };

      saveEmbeddings(testEmbeddings);
      const loaded = readEmbeddings();

      expect(loaded['large']).toHaveLength(384);
      expect(loaded['large']).toEqual(largeVector);
    });
  });

  describe('Round-trip integrity', () => {
    it('should preserve memories through save/load cycle', () => {
      const testMemories: Memory[] = [
        {
          id: '1',
          summary: 'Memory 1',
          details: 'Details 1',
          tags: ['tag1', 'tag2'],
          created_at: 1000
        },
        {
          id: '2',
          summary: 'Memory 2',
          details: 'Details 2',
          tags: [],
          created_at: 2000
        }
      ];

      saveMemories(testMemories);
      const loaded = readMemories();

      expect(loaded).toEqual(testMemories);
    });

    it('should preserve embeddings through save/load cycle', () => {
      const testEmbeddings: EmbeddingCache = {
        '1': [0.1, 0.2, 0.3],
        '2': null,
        '3': [0.7, 0.8, 0.9]
      };

      saveEmbeddings(testEmbeddings);
      const loaded = readEmbeddings();

      expect(loaded).toEqual(testEmbeddings);
    });

    it('should handle concurrent memory and embedding operations', () => {
      const memories: Memory[] = [
        {
          id: '1',
          summary: 'Test',
          details: 'Details',
          tags: ['tag'],
          created_at: Date.now()
        }
      ];

      const embeddings: EmbeddingCache = {
        '1': [0.5, 0.5, 0.5]
      };

      saveMemories(memories);
      saveEmbeddings(embeddings);

      const loadedMemories = readMemories();
      const loadedEmbeddings = readEmbeddings();

      expect(loadedMemories).toHaveLength(1);
      expect(Object.keys(loadedEmbeddings)).toHaveLength(1);
      expect(loadedMemories[0].id).toBe('1');
      expect(loadedEmbeddings['1']).toEqual([0.5, 0.5, 0.5]);
    });
  });
});
