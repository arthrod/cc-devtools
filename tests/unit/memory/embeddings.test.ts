/**
 * Embeddings unit tests for Memory tool
 * Tests cosine similarity calculation (embedding generation is tested separately)
 */

import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../../../src/shared/embeddings.js';

describe('Memory Embeddings', () => {
  describe('cosineSimilarity()', () => {
    it('should return 1 for identical vectors', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should handle normalized vectors', () => {
      const a = [0.6, 0.8];
      const b = [0.8, 0.6];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should calculate correct similarity for arbitrary vectors', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      const similarity = cosineSimilarity(a, b);

      // Manual calculation:
      // dot = 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      // normA = sqrt(1 + 4 + 9) = sqrt(14)
      // normB = sqrt(16 + 25 + 36) = sqrt(77)
      // cos = 32 / (sqrt(14) * sqrt(77)) = 0.9746...
      expect(similarity).toBeCloseTo(0.9746, 3);
    });

    it('should return 0 for different length vectors', () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBe(0);
    });

    it('should return 0 for zero vector', () => {
      const a = [1, 2, 3];
      const b = [0, 0, 0];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBe(0);
    });

    it('should handle both vectors being zero', () => {
      const a = [0, 0, 0];
      const b = [0, 0, 0];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBe(0);
    });

    it('should handle single element vectors', () => {
      const a = [5];
      const b = [10];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle negative values', () => {
      const a = [-1, -2, -3];
      const b = [-4, -5, -6];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(0.9746, 3); // Same as positive version
    });

    it('should handle mixed positive and negative values', () => {
      const a = [1, -2, 3];
      const b = [4, -5, 6];
      const similarity = cosineSimilarity(a, b);

      // dot = 1*4 + (-2)*(-5) + 3*6 = 4 + 10 + 18 = 32
      // Same as all positive
      expect(similarity).toBeCloseTo(0.9746, 3);
    });

    it('should handle very small values', () => {
      const a = [0.0001, 0.0002, 0.0003];
      const b = [0.0001, 0.0002, 0.0003];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle large vectors (realistic embedding size)', () => {
      const size = 384; // Common embedding dimension
      const a = Array.from({ length: size }, (_, i) => Math.sin(i));
      const b = Array.from({ length: size }, (_, i) => Math.cos(i));

      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeGreaterThan(-1);
      expect(similarity).toBeLessThan(1);
    });

    it('should be symmetric (order does not matter)', () => {
      const a = [1, 2, 3, 4, 5];
      const b = [6, 7, 8, 9, 10];

      const sim1 = cosineSimilarity(a, b);
      const sim2 = cosineSimilarity(b, a);

      expect(sim1).toBeCloseTo(sim2, 10);
    });

    it('should handle decimal values', () => {
      const a = [0.1, 0.2, 0.3, 0.4];
      const b = [0.5, 0.6, 0.7, 0.8];
      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1.0);
    });
  });
});
