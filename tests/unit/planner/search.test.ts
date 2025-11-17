/**
 * Search functionality tests for Planner tool
 * Tests keyword search, semantic search, and hybrid search
 */

import { describe, it, expect, vi } from 'vitest';
import { hybridSearch, filterByStatus } from '../../../src/planner/services/search.js';
import type { Plan } from '../../../src/planner/core/types.js';

// Mock the embeddings module
vi.mock('../../../src/planner/core/embeddings.js', () => ({
  generateEmbedding: vi.fn(async (text: string) => {
    // Simple mock: return deterministic embedding based on text
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [Math.sin(hash), Math.cos(hash), Math.sin(hash * 2), Math.cos(hash * 2)];
  }),
  generatePlanEmbedding: vi.fn(async (plan: Plan) => {
    const text = `${plan.summary} ${plan.goal} ${plan.decisions}`;
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [Math.sin(hash), Math.cos(hash), Math.sin(hash * 2), Math.cos(hash * 2)];
  }),
  cosineSimilarity: vi.fn((a: number[], b: number[]) => {
    // Simple cosine similarity implementation
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

// Mock the storage module
vi.mock('../../../src/planner/core/storage.js', () => ({
  readEmbeddings: vi.fn(() => ({})),
  saveEmbeddings: vi.fn()
}));

describe('Planner Search', () => {
  const createPlan = (overrides: Partial<Plan>): Plan => ({
    id: 'test-id',
    status: 'planning',
    summary: 'Test summary',
    goal: 'Test goal',
    decisions: 'Test decisions',
    implementation_plan: 'Test implementation',
    tasks: [],
    notes: '',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  });

  describe('filterByStatus()', () => {
    it('should return all plans when includeAll is true', () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'planning' }),
        createPlan({ id: 'p2', status: 'in_progress' }),
        createPlan({ id: 'p3', status: 'completed' }),
        createPlan({ id: 'p4', status: 'abandoned' })
      ];

      const filtered = filterByStatus(plans, true);

      expect(filtered).toHaveLength(4);
    });

    it('should filter to active plans when includeAll is false', () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'planning' }),
        createPlan({ id: 'p2', status: 'in_progress' }),
        createPlan({ id: 'p3', status: 'completed' }),
        createPlan({ id: 'p4', status: 'abandoned' })
      ];

      const filtered = filterByStatus(plans, false);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toContain('p1');
      expect(filtered.map(p => p.id)).toContain('p2');
      expect(filtered.map(p => p.id)).not.toContain('p3');
      expect(filtered.map(p => p.id)).not.toContain('p4');
    });

    it('should include on_hold plans in active filter (issue #1)', () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'planning' }),
        createPlan({ id: 'p2', status: 'in_progress' }),
        createPlan({ id: 'p3', status: 'on_hold' }),
        createPlan({ id: 'p4', status: 'completed' }),
        createPlan({ id: 'p5', status: 'abandoned' })
      ];

      const filtered = filterByStatus(plans, false);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toContain('p1');
      expect(filtered.map(p => p.id)).toContain('p2');
      expect(filtered.map(p => p.id)).toContain('p3');
      expect(filtered.map(p => p.id)).not.toContain('p4');
      expect(filtered.map(p => p.id)).not.toContain('p5');
    });

    it('should handle empty array', () => {
      const filtered = filterByStatus([], false);
      expect(filtered).toEqual([]);
    });
  });

  describe('hybridSearch() - empty query', () => {
    it('should return most recent plans when query is empty', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'First', updated_at: 1000 }),
        createPlan({ id: 'p2', summary: 'Second', updated_at: 3000 }),
        createPlan({ id: 'p3', summary: 'Third', updated_at: 2000 })
      ];

      const results = await hybridSearch('', plans, 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('p2'); // Most recent
      expect(results[1].id).toBe('p3'); // Second most recent
      expect(results[0].match_reason).toBe('most recent');
    });

    it('should return most recent plans when query is whitespace', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', updated_at: 1000 }),
        createPlan({ id: 'p2', updated_at: 2000 })
      ];

      const results = await hybridSearch('   ', plans, 1);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('p2');
    });

    it('should respect limit when returning recent plans', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', updated_at: 1000 }),
        createPlan({ id: 'p2', updated_at: 2000 }),
        createPlan({ id: 'p3', updated_at: 3000 })
      ];

      const results = await hybridSearch('', plans, 1);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('p3');
    });
  });

  describe('hybridSearch() - keyword matching', () => {
    it('should find exact ID match', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'auth-feature', summary: 'Authentication' }),
        createPlan({ id: 'api-feature', summary: 'API endpoints' })
      ];

      const results = await hybridSearch('auth-feature', plans);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('auth-feature');
    });

    it('should find matches in summary', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Implement authentication system' }),
        createPlan({ id: 'p2', summary: 'Build API endpoints' })
      ];

      const results = await hybridSearch('authentication', plans);

      expect(results.length).toBeGreaterThan(0);
      const ids = results.map(r => r.id);
      expect(ids).toContain('p1');
    });

    it('should find matches in goal', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', goal: 'Secure user authentication' }),
        createPlan({ id: 'p2', goal: 'Fast API responses' })
      ];

      const results = await hybridSearch('secure', plans);

      expect(results.length).toBeGreaterThan(0);
      const ids = results.map(r => r.id);
      expect(ids).toContain('p1');
    });

    it('should find matches in decisions', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', decisions: 'Using JWT tokens for auth' }),
        createPlan({ id: 'p2', decisions: 'Using REST API' })
      ];

      const results = await hybridSearch('JWT', plans);

      expect(results.length).toBeGreaterThan(0);
      const ids = results.map(r => r.id);
      expect(ids).toContain('p1');
    });

    it('should be case insensitive', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Authentication Feature' })
      ];

      const results = await hybridSearch('AUTHENTICATION', plans);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('p1');
    });

    it('should handle partial matches', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Authentication system' })
      ];

      const results = await hybridSearch('auth', plans);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('p1');
    });
  });

  describe('hybridSearch() - scoring and ranking', () => {
    it('should rank exact ID match highest', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'test', summary: 'Test in summary' }),
        createPlan({ id: 'other', summary: 'Test test test' })
      ];

      const results = await hybridSearch('test', plans);

      expect(results.length).toBeGreaterThan(0);
      // Exact ID match should rank higher than summary match
      expect(results[0].id).toBe('test');
    });

    it('should respect limit parameter', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Test 1' }),
        createPlan({ id: 'p2', summary: 'Test 2' }),
        createPlan({ id: 'p3', summary: 'Test 3' })
      ];

      const results = await hybridSearch('test', plans, 2);

      expect(results).toHaveLength(2);
    });

    it('should include match reason', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Test plan' })
      ];

      const results = await hybridSearch('test', plans);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].match_reason).toBeDefined();
      expect(typeof results[0].match_reason).toBe('string');
    });

    it('should include score', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Test plan' })
      ];

      const results = await hybridSearch('test', plans);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeDefined();
      expect(typeof results[0].score).toBe('number');
      expect(results[0].score).toBeGreaterThan(0);
    });
  });

  describe('hybridSearch() - status filtering', () => {
    it('should filter out completed plans by default', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'planning', summary: 'Active plan' }),
        createPlan({ id: 'p2', status: 'completed', summary: 'Done plan' })
      ];

      const results = await hybridSearch('plan', plans, 10, false);

      const ids = results.map(r => r.id);
      expect(ids).toContain('p1');
      expect(ids).not.toContain('p2');
    });

    it('should filter out abandoned plans by default', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'in_progress', summary: 'Active plan' }),
        createPlan({ id: 'p2', status: 'abandoned', summary: 'Abandoned plan' })
      ];

      const results = await hybridSearch('plan', plans, 10, false);

      const ids = results.map(r => r.id);
      expect(ids).toContain('p1');
      expect(ids).not.toContain('p2');
    });

    it('should include all statuses when includeAllStatuses is true', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'planning', summary: 'Planning' }),
        createPlan({ id: 'p2', status: 'in_progress', summary: 'In progress' }),
        createPlan({ id: 'p3', status: 'completed', summary: 'Completed' }),
        createPlan({ id: 'p4', status: 'abandoned', summary: 'Abandoned' })
      ];

      const results = await hybridSearch('', plans, 10, true);

      expect(results).toHaveLength(4);
    });

    it('should include on_hold plans by default (issue #1)', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'planning', summary: 'Planning plan' }),
        createPlan({ id: 'p2', status: 'in_progress', summary: 'Active plan' }),
        createPlan({ id: 'p3', status: 'on_hold', summary: 'Paused plan' }),
        createPlan({ id: 'p4', status: 'completed', summary: 'Done plan' })
      ];

      const results = await hybridSearch('plan', plans, 10, false);

      const ids = results.map(r => r.id);
      expect(ids).toContain('p1');
      expect(ids).toContain('p2');
      expect(ids).toContain('p3');
      expect(ids).not.toContain('p4');
    });
  });

  describe('hybridSearch() - edge cases', () => {
    it('should return empty array for empty plans', async () => {
      const results = await hybridSearch('test', []);

      expect(results).toEqual([]);
    });

    it('should return empty array when no plans match status filter', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', status: 'completed' }),
        createPlan({ id: 'p2', status: 'abandoned' })
      ];

      const results = await hybridSearch('test', plans, 10, false);

      expect(results).toEqual([]);
    });

    it('should handle special characters in query', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'API: user.authenticate()' })
      ];

      const results = await hybridSearch('user.authenticate()', plans);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(1000);
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Test' })
      ];

      const results = await hybridSearch(longQuery, plans);

      // Should not crash, may or may not find matches
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle plans with minimal content', async () => {
      const plans: Plan[] = [
        createPlan({
          id: 'minimal',
          summary: '',
          goal: '',
          decisions: '',
          implementation_plan: ''
        })
      ];

      const results = await hybridSearch('test', plans);

      // Should not crash
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle unicode in search query', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Emoji support 🎯' })
      ];

      const results = await hybridSearch('🎯', plans);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle limit of 0', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Test' })
      ];

      const results = await hybridSearch('test', plans, 0);

      expect(results).toEqual([]);
    });

    it('should handle limit larger than results', async () => {
      const plans: Plan[] = [
        createPlan({ id: 'p1', summary: 'Test' })
      ];

      const results = await hybridSearch('test', plans, 100);

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('hybridSearch() - semantic search', () => {
    it('should find semantically similar plans', async () => {
      const plans: Plan[] = [
        createPlan({
          id: 'p1',
          summary: 'User authentication',
          goal: 'Secure login system',
          decisions: 'JWT tokens'
        }),
        createPlan({
          id: 'p2',
          summary: 'Database schema',
          goal: 'Efficient data storage',
          decisions: 'PostgreSQL'
        })
      ];

      // Search for something semantically similar to p1
      const results = await hybridSearch('login security', plans);

      // Should find results (specific ranking depends on embedding mock)
      expect(results.length).toBeGreaterThan(0);
    });

    it('should combine keyword and semantic scores', async () => {
      const plans: Plan[] = [
        createPlan({
          id: 'p1',
          summary: 'Authentication system',
          goal: 'Secure user access'
        })
      ];

      const results = await hybridSearch('authentication', plans);

      expect(results.length).toBeGreaterThan(0);
      // Should have both keyword and potentially semantic matches
      expect(results[0].score).toBeGreaterThan(0);
    });
  });
});
