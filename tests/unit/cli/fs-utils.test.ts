import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
  ensureDir,
  copyFile,
  copyDir,
  fileExists,
  readJsonFile,
  writeJsonFile,
  appendToFile,
  readTextFile,
  writeTextFile,
} from '../../../src/cli/utils/fs-utils.js';
import { createTempDir, cleanupTempDir } from '../../helpers/test-utils.js';

describe('fs-utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('ensureDir', () => {
    it('should create a directory if it does not exist', async () => {
      const testDir = join(tempDir, 'new-dir');
      expect(existsSync(testDir)).toBe(false);

      await ensureDir(testDir);

      expect(existsSync(testDir)).toBe(true);
    });

    it('should create nested directories', async () => {
      const testDir = join(tempDir, 'parent', 'child', 'grandchild');

      await ensureDir(testDir);

      expect(existsSync(testDir)).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const testDir = join(tempDir, 'existing-dir');
      await ensureDir(testDir);

      await expect(ensureDir(testDir)).resolves.not.toThrow();
    });
  });

  describe('copyFile', () => {
    it('should copy a file to a new location', async () => {
      const srcFile = join(tempDir, 'source.txt');
      const destFile = join(tempDir, 'dest.txt');
      writeFileSync(srcFile, 'test content', 'utf-8');

      await copyFile(srcFile, destFile);

      expect(existsSync(destFile)).toBe(true);
      expect(readFileSync(destFile, 'utf-8')).toBe('test content');
    });

    it('should create destination directory if it does not exist', async () => {
      const srcFile = join(tempDir, 'source.txt');
      const destFile = join(tempDir, 'subdir', 'dest.txt');
      writeFileSync(srcFile, 'test content', 'utf-8');

      await copyFile(srcFile, destFile);

      expect(existsSync(destFile)).toBe(true);
    });
  });

  describe('copyDir', () => {
    it('should copy all files from source directory to destination', async () => {
      const srcDir = join(tempDir, 'src');
      const destDir = join(tempDir, 'dest');

      await ensureDir(srcDir);
      writeFileSync(join(srcDir, 'file1.txt'), 'content1', 'utf-8');
      writeFileSync(join(srcDir, 'file2.txt'), 'content2', 'utf-8');

      await copyDir(srcDir, destDir);

      expect(existsSync(join(destDir, 'file1.txt'))).toBe(true);
      expect(existsSync(join(destDir, 'file2.txt'))).toBe(true);
      expect(readFileSync(join(destDir, 'file1.txt'), 'utf-8')).toBe('content1');
    });

    it('should recursively copy subdirectories', async () => {
      const srcDir = join(tempDir, 'src');
      const destDir = join(tempDir, 'dest');

      await ensureDir(join(srcDir, 'subdir'));
      writeFileSync(join(srcDir, 'root.txt'), 'root', 'utf-8');
      writeFileSync(join(srcDir, 'subdir', 'nested.txt'), 'nested', 'utf-8');

      await copyDir(srcDir, destDir);

      expect(existsSync(join(destDir, 'root.txt'))).toBe(true);
      expect(existsSync(join(destDir, 'subdir', 'nested.txt'))).toBe(true);
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', () => {
      const testFile = join(tempDir, 'exists.txt');
      writeFileSync(testFile, 'content', 'utf-8');

      expect(fileExists(testFile)).toBe(true);
    });

    it('should return false if file does not exist', () => {
      const testFile = join(tempDir, 'does-not-exist.txt');

      expect(fileExists(testFile)).toBe(false);
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file', async () => {
      const testFile = join(tempDir, 'test.json');
      const testData = { foo: 'bar', num: 42 };
      writeFileSync(testFile, JSON.stringify(testData), 'utf-8');

      const result = await readJsonFile(testFile);

      expect(result).toEqual(testData);
    });

    it('should throw on invalid JSON', async () => {
      const testFile = join(tempDir, 'invalid.json');
      writeFileSync(testFile, 'not json', 'utf-8');

      await expect(readJsonFile(testFile)).rejects.toThrow();
    });
  });

  describe('writeJsonFile', () => {
    it('should write object as formatted JSON', async () => {
      const testFile = join(tempDir, 'output.json');
      const testData = { foo: 'bar', num: 42 };

      await writeJsonFile(testFile, testData);

      expect(existsSync(testFile)).toBe(true);
      const content = readFileSync(testFile, 'utf-8');
      expect(JSON.parse(content)).toEqual(testData);
    });

    it('should format JSON with 2-space indentation', async () => {
      const testFile = join(tempDir, 'formatted.json');
      const testData = { foo: 'bar' };

      await writeJsonFile(testFile, testData);

      const content = readFileSync(testFile, 'utf-8');
      expect(content).toContain('  "foo"');
    });
  });

  describe('appendToFile', () => {
    it('should append content to existing file', async () => {
      const testFile = join(tempDir, 'append.txt');
      writeFileSync(testFile, 'first\n', 'utf-8');

      await appendToFile(testFile, 'second\n');

      const content = readFileSync(testFile, 'utf-8');
      expect(content).toBe('first\nsecond\n');
    });

    it('should create file if it does not exist', async () => {
      const testFile = join(tempDir, 'new-append.txt');

      await appendToFile(testFile, 'content\n');

      expect(existsSync(testFile)).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe('content\n');
    });
  });

  describe('readTextFile', () => {
    it('should read text file content', async () => {
      const testFile = join(tempDir, 'text.txt');
      writeFileSync(testFile, 'hello world', 'utf-8');

      const content = await readTextFile(testFile);

      expect(content).toBe('hello world');
    });
  });

  describe('writeTextFile', () => {
    it('should write text content to file', async () => {
      const testFile = join(tempDir, 'output.txt');

      await writeTextFile(testFile, 'test content');

      expect(existsSync(testFile)).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe('test content');
    });
  });
});
