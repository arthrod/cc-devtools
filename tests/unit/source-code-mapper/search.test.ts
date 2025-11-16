/**
 * Search functionality tests for Source-code-mapper
 * Tests keyword, semantic, and fuzzy search modes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchSymbols } from '../../../src/source-code-mapper/services/search.js';
import { createEmptyIndex } from '../../../src/source-code-mapper/core/storage.js';
import type { Index, Symbol } from '../../../src/source-code-mapper/core/types.js';

// Mock the embeddings module
vi.mock('../../../src/source-code-mapper/core/embeddings.js', () => ({
  generateEmbedding: vi.fn(async (text: string) => {
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const embedding = new Float32Array(4);
    embedding[0] = Math.sin(hash);
    embedding[1] = Math.cos(hash);
    embedding[2] = Math.sin(hash * 2);
    embedding[3] = Math.cos(hash * 2);
    return embedding;
  }),
  cosineSimilarity: vi.fn((a: Float32Array, b: Float32Array) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  })
}));

describe('Source-code-mapper Search', () => {
  let testIndex: Index;

  beforeEach(() => {
    testIndex = createEmptyIndex();

    // Add test symbols
    testIndex.symbols.set('auth.ts', [
      {
        name: 'authenticate',
        type: 'function',
        startLine: 10,
        endLine: 20,
        isExported: true,
        signature: 'function authenticate(user: User): Promise<Token>',
        file: 'auth.ts'
      },
      {
        name: 'AuthService',
        type: 'class',
        startLine: 25,
        endLine: 100,
        isExported: true,
        signature: 'class AuthService',
        file: 'auth.ts'
      }
    ]);

    testIndex.symbols.set('user.ts', [
      {
        name: 'User',
        type: 'interface',
        startLine: 5,
        endLine: 15,
        isExported: true,
        file: 'user.ts'
      },
      {
        name: 'createUser',
        type: 'function',
        startLine: 20,
        endLine: 30,
        isExported: false,
        file: 'user.ts'
      }
    ]);

    testIndex.symbols.set('api/endpoints.ts', [
      {
        name: 'loginEndpoint',
        type: 'const',
        startLine: 10,
        endLine: 15,
        isExported: true,
        file: 'api/endpoints.ts'
      }
    ]);
  });

  describe('Exact search mode', () => {
    it('should find exact name match', async () => {
      const results = await searchSymbols(testIndex, 'authenticate', 'exact');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('authenticate');
      expect(results[0].match_reason).toContain('exact');
    });

    it('should find partial name match', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'exact');

      expect(results.length).toBeGreaterThan(0);
      const names = results.map(r => r.name);
      expect(names).toContain('authenticate');
      expect(names).toContain('AuthService');
    });

    it('should be case insensitive', async () => {
      const results = await searchSymbols(testIndex, 'AUTHENTICATE', 'exact');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('authenticate');
    });

    it('should find by file path', async () => {
      const results = await searchSymbols(testIndex, 'endpoints', 'exact');

      expect(results.length).toBeGreaterThan(0);
      const fileMatch = results.find(r => r.file === 'api/endpoints.ts');
      expect(fileMatch).toBeDefined();
    });

    it('should return empty array when no match', async () => {
      const results = await searchSymbols(testIndex, 'nonexistent', 'exact');

      expect(results).toEqual([]);
    });

    it('should rank exact matches higher than partial', async () => {
      const results = await searchSymbols(testIndex, 'user', 'exact');

      expect(results.length).toBeGreaterThan(0);
      // "User" exact match should rank higher than "createUser" partial match
      expect(results[0].name).toBe('User');
    });
  });

  describe('Filters', () => {
    it('should filter by symbol type', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'exact', { type: ['function'] });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.type).toBe('function');
      });
    });

    it('should filter by multiple types', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'exact', {
        type: ['function', 'class']
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(['function', 'class']).toContain(r.type);
      });
    });

    it('should filter exported only', async () => {
      const results = await searchSymbols(testIndex, 'user', 'exact', {
        exported_only: true
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.isExported).toBe(true);
      });

      const names = results.map(r => r.name);
      expect(names).not.toContain('createUser'); // Not exported
    });

    it('should combine type and exported filters', async () => {
      const results = await searchSymbols(testIndex, '', 'exact', {
        type: ['function'],
        exported_only: true
      });

      results.forEach(r => {
        expect(r.type).toBe('function');
        expect(r.isExported).toBe(true);
      });
    });
  });

  describe('Limit parameter', () => {
    it('should respect limit', async () => {
      const results = await searchSymbols(testIndex, 'a', 'exact', undefined, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should default to 10', async () => {
      // Add many symbols
      const manySymbols: Symbol[] = [];
      for (let i = 0; i < 20; i++) {
        manySymbols.push({
          name: `testFunction${i}`,
          type: 'function',
          startLine: i,
          endLine: i + 1,
          isExported: true,
          file: 'test.ts'
        });
      }
      testIndex.symbols.set('test.ts', manySymbols);

      const results = await searchSymbols(testIndex, 'test', 'exact');

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should handle limit of 0', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'exact', undefined, 0);

      expect(results).toEqual([]);
    });

    it('should handle limit larger than results', async () => {
      const results = await searchSymbols(testIndex, 'authenticate', 'exact', undefined, 100);

      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Fuzzy search mode', () => {
    it('should find fuzzy matches', async () => {
      const results = await searchSymbols(testIndex, 'authenticat', 'fuzzy');

      // Fuzzy requires score > 0.5, so need closer match
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle typos', async () => {
      const results = await searchSymbols(testIndex, 'authentcate', 'fuzzy');

      // Fuzzy search should still find authenticate despite typo
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Semantic search mode', () => {
    it('should find semantically similar symbols', async () => {
      const results = await searchSymbols(testIndex, 'login', 'semantic');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should combine keyword and semantic results', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'semantic');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should work with empty query', async () => {
      const results = await searchSymbols(testIndex, '', 'semantic');

      // Should return some results or empty array
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Scoring and ranking', () => {
    it('should include score in results', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'exact');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.score).toBeGreaterThan(0);
        expect(typeof r.score).toBe('number');
      });
    });

    it('should include match reason', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'exact');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.match_reason).toBeDefined();
        expect(typeof r.match_reason).toBe('string');
      });
    });

    it('should sort by score descending', async () => {
      const results = await searchSymbols(testIndex, 'auth', 'exact');

      expect(results.length).toBeGreaterThan(1);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty index', async () => {
      const emptyIndex = createEmptyIndex();
      const results = await searchSymbols(emptyIndex, 'test', 'exact');

      expect(results).toEqual([]);
    });

    it('should handle special characters in query', async () => {
      const results = await searchSymbols(testIndex, 'user.create()', 'exact');

      // Should not crash
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long query', async () => {
      const longQuery = 'a'.repeat(1000);
      const results = await searchSymbols(testIndex, longQuery, 'exact');

      // Should not crash
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle unicode in query', async () => {
      const results = await searchSymbols(testIndex, '🔍', 'exact');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should preserve all symbol fields in results', async () => {
      const results = await searchSymbols(testIndex, 'authenticate', 'exact');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      expect(result.name).toBe('authenticate');
      expect(result.type).toBe('function');
      expect(result.startLine).toBe(10);
      expect(result.endLine).toBe(20);
      expect(result.isExported).toBe(true);
      expect(result.signature).toBe('function authenticate(user: User): Promise<Token>');
      expect(result.file).toBe('auth.ts');
      expect(result.score).toBeGreaterThan(0);
      expect(result.match_reason).toBeDefined();
    });
  });
});
