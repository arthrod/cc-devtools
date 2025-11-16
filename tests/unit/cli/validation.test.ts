import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isValidProjectRoot, validateFeatures } from '../../../src/cli/utils/validation.js';
import { createTempDir, cleanupTempDir, createMockPackageJson } from '../../helpers/test-utils.js';

describe('validation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('isValidProjectRoot', () => {
    it('should return true if package.json exists', () => {
      createMockPackageJson(tempDir);

      const result = isValidProjectRoot(tempDir);

      expect(result).toBe(true);
    });

    it('should return false if package.json does not exist', () => {
      const result = isValidProjectRoot(tempDir);

      expect(result).toBe(false);
    });
  });

  describe('validateFeatures', () => {
    it('should identify all valid features', () => {
      const features = ['kanban', 'memory', 'planner', 'source-code-mapper'];

      const result = validateFeatures(features);

      expect(result.valid).toEqual(features);
      expect(result.invalid).toEqual([]);
    });

    it('should identify invalid features', () => {
      const features = ['kanban', 'invalid-feature', 'memory', 'another-invalid'];

      const result = validateFeatures(features);

      expect(result.valid).toEqual(['kanban', 'memory']);
      expect(result.invalid).toEqual(['invalid-feature', 'another-invalid']);
    });

    it('should return empty arrays for empty input', () => {
      const result = validateFeatures([]);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('should handle all invalid features', () => {
      const features = ['foo', 'bar', 'baz'];

      const result = validateFeatures(features);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual(['foo', 'bar', 'baz']);
    });

    it('should validate individual features correctly', () => {
      expect(validateFeatures(['kanban']).valid).toContain('kanban');
      expect(validateFeatures(['memory']).valid).toContain('memory');
      expect(validateFeatures(['planner']).valid).toContain('planner');
      expect(validateFeatures(['source-code-mapper']).valid).toContain('source-code-mapper');
    });
  });
});
