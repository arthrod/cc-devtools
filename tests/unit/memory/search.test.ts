/**
 * Search unit tests for Memory tool
 * Tests keyword search, semantic search, and hybrid search functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { searchMemories } from '../../../src/memory/services/search.js';
import { saveMemories, saveEmbeddings } from '../../../src/memory/core/storage.js';
import type { Memory, EmbeddingCache } from '../../../src/memory/core/types.js';
import * as embeddings from '../../../src/shared/embeddings.js';

describe('Memory Search', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp test directory and switch to it
    originalCwd = process.cwd();
    testDir = join(originalCwd, '.test-memory-search-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory and cleanup
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
    vi.restoreAllMocks();
  });

  const createTestMemories = (): Memory[] => [
    {
      id: '1',
      summary: 'Bug fix for authentication',
      details: 'Fixed the login issue where users could not authenticate with OAuth',
      tags: ['bug', 'auth', 'oauth'],
      created_at: 1000
    },
    {
      id: '2',
      summary: 'Feature: Add dark mode',
      details: 'Implemented dark mode theme for better UX at night',
      tags: ['feature', 'ui', 'ux'],
      created_at: 2000
    },
    {
      id: '3',
      summary: 'Database optimization',
      details: 'Optimized database queries for authentication endpoints',
      tags: ['performance', 'database', 'auth'],
      created_at: 3000
    },
    {
      id: '4',
      summary: 'Documentation update',
      details: 'Updated API documentation for new authentication methods',
      tags: ['docs', 'api', 'auth'],
      created_at: 4000
    }
  ];

  describe('Empty query behavior', () => {
    it('should return recent memories when query is empty', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      const results = await searchMemories('', memories, 3);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('4'); // Most recent
      expect(results[1].id).toBe('3');
      expect(results[2].id).toBe('2');
      expect(results[0].match_reason).toBe('recent memory');
    });

    it('should return all memories when limit exceeds count', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      const results = await searchMemories('', memories, 10);

      expect(results).toHaveLength(4);
    });

    it('should handle whitespace-only query as empty', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      const results = await searchMemories('   ', memories, 2);

      expect(results).toHaveLength(2);
      expect(results[0].match_reason).toBe('recent memory');
    });
  });

  describe('Keyword search', () => {
    it('should find exact tag match', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      // Mock embedding to disable semantic search
      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('oauth', memories, 5);

      expect(results.length).toBeGreaterThan(0);
      const oauthResult = results.find(r => r.tags.includes('oauth'));
      expect(oauthResult).toBeDefined();
      expect(oauthResult?.match_reason).toContain('exact tag match');
    });

    it('should find partial tag match', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('aut', memories, 5);

      // Should match 'auth' and 'oauth' tags
      expect(results.length).toBeGreaterThan(0);
      const authResults = results.filter(r =>
        r.tags.some(tag => tag.includes('aut'))
      );
      expect(authResults.length).toBeGreaterThan(0);
    });

    it('should find summary match', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('dark mode', memories, 5);

      expect(results.length).toBeGreaterThan(0);
      const darkModeResult = results.find(r => r.summary.includes('dark mode'));
      expect(darkModeResult).toBeDefined();
      expect(darkModeResult?.match_reason).toContain('summary match');
    });

    it('should find details match', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('OAuth', memories, 5);

      expect(results.length).toBeGreaterThan(0);
      const oauthResult = results.find(r => r.details.toLowerCase().includes('oauth'));
      expect(oauthResult).toBeDefined();
      expect(oauthResult?.match_reason).toContain('details match');
    });

    it('should be case insensitive', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const lowerResults = await searchMemories('authentication', memories, 5);
      const upperResults = await searchMemories('AUTHENTICATION', memories, 5);
      const mixedResults = await searchMemories('AuThEnTiCaTiOn', memories, 5);

      expect(lowerResults).toHaveLength(upperResults.length);
      expect(lowerResults).toHaveLength(mixedResults.length);
    });

    it('should combine multiple match reasons', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('auth', memories, 5);

      // 'auth' should match tags, summary, and details in multiple memories
      const multiMatchResult = results.find(r =>
        r.match_reason.includes(',')
      );
      expect(multiMatchResult).toBeDefined();
    });

    it('should return empty array when no matches', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('nonexistent-query-xyz', memories, 5);

      expect(results).toHaveLength(0);
    });
  });

  describe('Semantic search', () => {
    it('should find semantically similar memories', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      // Mock embeddings with similar vectors for auth-related memories
      const mockEmbeddings: EmbeddingCache = {
        '1': [0.9, 0.1, 0.1], // Bug fix auth
        '2': [0.1, 0.9, 0.1], // Dark mode (different)
        '3': [0.85, 0.15, 0.1], // DB optimization auth (similar to 1)
        '4': [0.88, 0.12, 0.1]  // Docs auth (similar to 1)
      };
      saveEmbeddings(mockEmbeddings);

      // Mock query embedding to be similar to auth memories
      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue([0.9, 0.1, 0.1]);

      const results = await searchMemories('login problems', memories, 5);

      // Should find auth-related memories (1, 3, 4) with high similarity
      expect(results.length).toBeGreaterThan(0);
      const semanticResults = results.filter(r =>
        r.match_reason.includes('semantic similarity')
      );
      expect(semanticResults.length).toBeGreaterThan(0);
    });

    it('should filter by similarity threshold', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      const mockEmbeddings: EmbeddingCache = {
        '1': [0.9, 0.1],
        '2': [0.2, 0.8], // Low similarity
        '3': [0.85, 0.15], // High similarity
        '4': [0.1, 0.9]  // Low similarity
      };
      saveEmbeddings(mockEmbeddings);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue([0.9, 0.1]);

      const results = await searchMemories('test query', memories, 10);

      // Only memories with similarity > 0.3 should be returned
      const semanticResults = results.filter(r =>
        r.match_reason.includes('semantic similarity')
      );

      // Memories 1 and 3 should have high similarity, 2 and 4 should be filtered
      expect(semanticResults.some(r => r.id === '1')).toBe(true);
      expect(semanticResults.some(r => r.id === '3')).toBe(true);
    });

    it('should skip memories without embeddings', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      const mockEmbeddings: EmbeddingCache = {
        '1': [0.9, 0.1],
        // '2' missing
        '3': [0.85, 0.15]
        // '4' missing
      };
      saveEmbeddings(mockEmbeddings);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue([0.9, 0.1]);

      const results = await searchMemories('test', memories, 10);

      const semanticResults = results.filter(r =>
        r.match_reason.includes('semantic similarity')
      );

      // Only memories with embeddings should appear in semantic results
      const semanticIds = semanticResults.map(r => r.id);
      expect(semanticIds.includes('1')).toBe(true);
      expect(semanticIds.includes('3')).toBe(true);
      // '2' and '4' should not appear in semantic results
    });

    it('should handle null query embedding gracefully', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      // Should fall back to keyword search only
      const results = await searchMemories('auth', memories, 5);

      // Should still find results via keyword search
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.match_reason).not.toContain('semantic similarity');
      });
    });
  });

  describe('Hybrid search (keyword + semantic)', () => {
    it('should combine keyword and semantic scores', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      const mockEmbeddings: EmbeddingCache = {
        '1': [0.9, 0.1],
        '2': [0.1, 0.9],
        '3': [0.85, 0.15],
        '4': [0.88, 0.12]
      };
      saveEmbeddings(mockEmbeddings);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue([0.9, 0.1]);

      const results = await searchMemories('auth', memories, 5);

      // Should have results with both keyword and semantic matches
      const hybridResults = results.filter(r =>
        r.match_reason.includes('tag') && r.match_reason.includes('semantic')
      );

      expect(hybridResults.length).toBeGreaterThan(0);
    });

    it('should rank results by combined score', async () => {
      const memories: Memory[] = [
        {
          id: '1',
          summary: 'Auth bug',
          details: 'Details',
          tags: ['auth'],
          created_at: 1000
        },
        {
          id: '2',
          summary: 'Unrelated',
          details: 'Nothing',
          tags: [],
          created_at: 2000
        }
      ];
      saveMemories(memories);

      const mockEmbeddings: EmbeddingCache = {
        '1': [0.9, 0.1], // High semantic similarity
        '2': [0.2, 0.8]  // Low semantic similarity
      };
      saveEmbeddings(mockEmbeddings);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue([0.9, 0.1]);

      const results = await searchMemories('auth', memories, 5);

      // Memory 1 should rank higher due to both keyword and semantic match
      expect(results[0].id).toBe('1');
      expect(results[0].score).toBeGreaterThan(1); // Combined score
    });

    it('should deduplicate results from both searches', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      const mockEmbeddings: EmbeddingCache = {
        '1': [0.9, 0.1],
        '2': [0.1, 0.9],
        '3': [0.85, 0.15],
        '4': [0.88, 0.12]
      };
      saveEmbeddings(mockEmbeddings);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue([0.9, 0.1]);

      const results = await searchMemories('auth', memories, 10);

      // Check for unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('Result limiting', () => {
    it('should respect limit parameter', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results1 = await searchMemories('auth', memories, 1);
      const results2 = await searchMemories('auth', memories, 2);
      const results3 = await searchMemories('auth', memories, 3);

      expect(results1).toHaveLength(1);
      expect(results2.length).toBeLessThanOrEqual(2);
      expect(results3.length).toBeLessThanOrEqual(3);
    });

    it('should default to limit of 3', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('auth', memories);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return fewer results if not enough matches', async () => {
      const memories: Memory[] = [
        {
          id: '1',
          summary: 'Only match',
          details: 'Contains keyword auth',
          tags: [],
          created_at: 1000
        },
        {
          id: '2',
          summary: 'No match',
          details: 'Nothing',
          tags: [],
          created_at: 2000
        }
      ];
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('auth', memories, 5);

      expect(results.length).toBe(1);
    });
  });

  describe('Score calculation', () => {
    it('should assign higher score for exact tag match', async () => {
      const memories: Memory[] = [
        {
          id: '1',
          summary: 'Test',
          details: 'Details',
          tags: ['auth'], // Exact match
          created_at: 1000
        },
        {
          id: '2',
          summary: 'Test auth', // Summary match
          details: 'Details',
          tags: [],
          created_at: 2000
        }
      ];
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('auth', memories, 5);

      const exactTagMatch = results.find(r => r.id === '1');
      const summaryMatch = results.find(r => r.id === '2');

      expect(exactTagMatch?.score).toBeGreaterThan(summaryMatch?.score || 0);
    });

    it('should return results sorted by score descending', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('auth', memories, 10);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty memories array', async () => {
      const results = await searchMemories('test', [], 5);
      expect(results).toHaveLength(0);
    });

    it('should handle special characters in query', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const results = await searchMemories('auth@#$%', memories, 5);

      // Should not crash, might return 0 results
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long query', async () => {
      const memories = createTestMemories();
      saveMemories(memories);

      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(null);

      const longQuery = 'authentication authentication authentication '.repeat(50);
      const results = await searchMemories(longQuery, memories, 5);

      // Long query might not match anything - just verify it doesn't crash
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
