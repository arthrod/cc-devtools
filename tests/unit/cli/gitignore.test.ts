import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { addToGitignore, isInGitignore } from '../../../src/cli/utils/gitignore.js';
import { createTempDir, cleanupTempDir, createMockGitignore } from '../../helpers/test-utils.js';

describe('gitignore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('addToGitignore', () => {
    it('should create .gitignore if it does not exist', async () => {
      const result = await addToGitignore(tempDir);

      expect(result).toBe(true);
      const gitignorePath = join(tempDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('cc-devtools/.cache');
    });

    it('should add entry to existing .gitignore', async () => {
      createMockGitignore(tempDir, 'node_modules/\ndist/\n');

      const result = await addToGitignore(tempDir);

      expect(result).toBe(true);
      const gitignorePath = join(tempDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('cc-devtools/.cache');
    });

    it('should not add duplicate entry', async () => {
      createMockGitignore(tempDir, 'node_modules/\ncc-devtools/.cache\n');

      const result = await addToGitignore(tempDir);

      expect(result).toBe(false);
      const gitignorePath = join(tempDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      const matches = content.match(/cc-devtools\/\.cache/g);
      expect(matches).toHaveLength(1);
    });

    it('should handle .gitignore without trailing newline', async () => {
      createMockGitignore(tempDir, 'node_modules/');

      const result = await addToGitignore(tempDir);

      expect(result).toBe(true);
      const gitignorePath = join(tempDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('cc-devtools/.cache');
    });

    it('should add comment before entry', async () => {
      const result = await addToGitignore(tempDir);

      expect(result).toBe(true);
      const gitignorePath = join(tempDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('# cc-devtools cache');
    });
  });

  describe('isInGitignore', () => {
    it('should return false if .gitignore does not exist', async () => {
      const result = await isInGitignore(tempDir);

      expect(result).toBe(false);
    });

    it('should return true if entry exists in .gitignore', async () => {
      createMockGitignore(tempDir, 'node_modules/\ncc-devtools/.cache\n');

      const result = await isInGitignore(tempDir);

      expect(result).toBe(true);
    });

    it('should return false if entry does not exist', async () => {
      createMockGitignore(tempDir, 'node_modules/\ndist/\n');

      const result = await isInGitignore(tempDir);

      expect(result).toBe(false);
    });

    it('should handle entry with surrounding whitespace', async () => {
      createMockGitignore(tempDir, 'node_modules/\n  cc-devtools/.cache  \n');

      const result = await isInGitignore(tempDir);

      expect(result).toBe(true);
    });
  });
});
