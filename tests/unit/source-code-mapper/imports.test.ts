/**
 * Import graph query tests for Source-code-mapper
 * Tests import tracking, import graph queries, and usage analysis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFileImports,
  findImporters,
  getFunctionImportUsage
} from '../../../src/source-code-mapper/services/imports.js';
import { createEmptyIndex } from '../../../src/source-code-mapper/core/storage.js';
import type { Index } from '../../../src/source-code-mapper/core/types.js';

describe('Source-code-mapper Import Queries', () => {
  let testIndex: Index;

  beforeEach(() => {
    testIndex = createEmptyIndex();

    // Add test imports
    testIndex.imports.set('app.ts', [
      {
        source: './auth',
        imported: ['authenticate', 'AuthService'],
        usedBy: ['loginHandler', 'protectedRoute']
      },
      {
        source: './user',
        imported: ['User', 'createUser'],
        usedBy: ['loginHandler']
      },
      {
        source: 'express',
        imported: ['Request', 'Response'],
        usedBy: ['loginHandler', 'logoutHandler']
      }
    ]);

    testIndex.imports.set('auth.ts', [
      {
        source: './database',
        imported: ['query'],
        usedBy: ['authenticate']
      },
      {
        source: 'bcrypt',
        imported: ['compare'],
        usedBy: ['authenticate']
      }
    ]);

    testIndex.imports.set('user.ts', [
      {
        source: './database',
        imported: ['query', 'insert'],
        usedBy: ['createUser', 'findUser']
      }
    ]);
  });

  describe('getFileImports()', () => {
    it('should return imports for existing file', () => {
      const result = getFileImports(testIndex, 'app.ts');

      expect(result).not.toBeNull();
      expect(result?.file).toBe('app.ts');
      expect(result?.imports).toHaveLength(3);
    });

    it('should return null for non-existent file', () => {
      const result = getFileImports(testIndex, 'nonexistent.ts');

      expect(result).toBeNull();
    });

    it('should return all import details', () => {
      const result = getFileImports(testIndex, 'app.ts');

      expect(result?.imports[0].source).toBe('./auth');
      expect(result?.imports[0].imported).toEqual(['authenticate', 'AuthService']);
      expect(result?.imports[0].usedBy).toEqual(['loginHandler', 'protectedRoute']);
    });

    it('should handle file with single import', () => {
      testIndex.imports.set('single.ts', [
        {
          source: './utils',
          imported: ['helper'],
          usedBy: ['main']
        }
      ]);

      const result = getFileImports(testIndex, 'single.ts');

      expect(result?.imports).toHaveLength(1);
    });

    it('should handle file with no imports', () => {
      testIndex.imports.set('empty.ts', []);

      const result = getFileImports(testIndex, 'empty.ts');

      expect(result).not.toBeNull();
      expect(result?.imports).toEqual([]);
    });

    it('should handle empty index', () => {
      const emptyIndex = createEmptyIndex();
      const result = getFileImports(emptyIndex, 'app.ts');

      expect(result).toBeNull();
    });
  });

  describe('findImporters()', () => {
    it('should find files that import a module (exact match)', () => {
      const results = findImporters(testIndex, './database');

      expect(results).toHaveLength(2);
      const files = results.map(r => r.file);
      expect(files).toContain('auth.ts');
      expect(files).toContain('user.ts');
    });

    it('should find files that import a module (ending with module name)', () => {
      const results = findImporters(testIndex, 'database');

      expect(results).toHaveLength(2);
      const files = results.map(r => r.file);
      expect(files).toContain('auth.ts');
      expect(files).toContain('user.ts');
    });

    it('should find files importing node_modules package', () => {
      const results = findImporters(testIndex, 'bcrypt');

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe('auth.ts');
    });

    it('should match module with .js extension', () => {
      testIndex.imports.set('test.js', [
        {
          source: './utils.js',
          imported: ['helper'],
          usedBy: ['main']
        }
      ]);

      const results = findImporters(testIndex, 'utils');

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe('test.js');
    });

    it('should match module with .ts extension', () => {
      const results = findImporters(testIndex, 'auth');

      // Should match './auth' from app.ts
      expect(results).toHaveLength(1);
      expect(results[0].file).toBe('app.ts');
    });

    it('should return empty array when no importers found', () => {
      const results = findImporters(testIndex, 'nonexistent');

      expect(results).toEqual([]);
    });

    it('should return only matching imports in results', () => {
      const results = findImporters(testIndex, 'database');

      results.forEach(result => {
        result.imports.forEach(imp => {
          expect(imp.source).toContain('database');
        });
      });
    });

    it('should handle multiple imports of same module', () => {
      testIndex.imports.set('multi.ts', [
        {
          source: './database',
          imported: ['query'],
          usedBy: ['func1']
        },
        {
          source: './other',
          imported: ['helper'],
          usedBy: ['func2']
        }
      ]);

      const results = findImporters(testIndex, 'database');

      const multiResult = results.find(r => r.file === 'multi.ts');
      expect(multiResult).toBeDefined();
      expect(multiResult?.imports).toHaveLength(1);
      expect(multiResult?.imports[0].source).toBe('./database');
    });

    it('should handle path with multiple slashes', () => {
      testIndex.imports.set('deep.ts', [
        {
          source: './path/to/nested/module',
          imported: ['something'],
          usedBy: ['func']
        }
      ]);

      const results = findImporters(testIndex, 'module');

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe('deep.ts');
    });

    it('should be case sensitive', () => {
      const results1 = findImporters(testIndex, 'Database');
      const results2 = findImporters(testIndex, 'database');

      // './database' should not match 'Database'
      expect(results1.length).toBe(0);
      expect(results2.length).toBeGreaterThan(0);
    });
  });

  describe('getFunctionImportUsage()', () => {
    it('should return imports used by specific function', () => {
      const result = getFunctionImportUsage(testIndex, 'app.ts', 'loginHandler');

      expect(result).not.toBeNull();
      expect(result?.file).toBe('app.ts');
      expect(result?.imports).toHaveLength(3);

      const sources = result?.imports.map(imp => imp.source);
      expect(sources).toContain('./auth');
      expect(sources).toContain('./user');
      expect(sources).toContain('express');
    });

    it('should return null for non-existent file', () => {
      const result = getFunctionImportUsage(testIndex, 'nonexistent.ts', 'func');

      expect(result).toBeNull();
    });

    it('should return null for function that does not use any imports', () => {
      const result = getFunctionImportUsage(testIndex, 'app.ts', 'unusedFunction');

      expect(result).toBeNull();
    });

    it('should return only imports used by the function', () => {
      const result = getFunctionImportUsage(testIndex, 'app.ts', 'protectedRoute');

      expect(result).not.toBeNull();
      expect(result?.imports).toHaveLength(1);
      expect(result?.imports[0].source).toBe('./auth');
    });

    it('should handle function using multiple imports from same source', () => {
      const result = getFunctionImportUsage(testIndex, 'app.ts', 'loginHandler');

      const authImport = result?.imports.find(imp => imp.source === './auth');
      expect(authImport?.imported).toEqual(['authenticate', 'AuthService']);
      expect(authImport?.usedBy).toContain('loginHandler');
    });

    it('should handle function appearing in multiple import usedBy arrays', () => {
      const result = getFunctionImportUsage(testIndex, 'app.ts', 'loginHandler');

      expect(result?.imports.length).toBeGreaterThan(1);
    });

    it('should return empty imports array for file with no imports', () => {
      testIndex.imports.set('empty.ts', []);

      const result = getFunctionImportUsage(testIndex, 'empty.ts', 'func');

      expect(result).toBeNull();
    });

    it('should handle nested function names', () => {
      testIndex.imports.set('nested.ts', [
        {
          source: './utils',
          imported: ['helper'],
          usedBy: ['Class.method']
        }
      ]);

      const result = getFunctionImportUsage(testIndex, 'nested.ts', 'Class.method');

      expect(result).not.toBeNull();
      expect(result?.imports).toHaveLength(1);
    });

    it('should be case sensitive for function names', () => {
      const result1 = getFunctionImportUsage(testIndex, 'app.ts', 'loginHandler');
      const result2 = getFunctionImportUsage(testIndex, 'app.ts', 'LoginHandler');

      expect(result1).not.toBeNull();
      expect(result2).toBeNull();
    });

    it('should handle function with no import usage', () => {
      testIndex.imports.set('test.ts', [
        {
          source: './utils',
          imported: ['helper'],
          usedBy: ['otherFunc']
        }
      ]);

      const result = getFunctionImportUsage(testIndex, 'test.ts', 'targetFunc');

      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty index for all functions', () => {
      const emptyIndex = createEmptyIndex();

      expect(getFileImports(emptyIndex, 'test.ts')).toBeNull();
      expect(findImporters(emptyIndex, 'module')).toEqual([]);
      expect(getFunctionImportUsage(emptyIndex, 'test.ts', 'func')).toBeNull();
    });

    it('should handle special characters in file paths', () => {
      testIndex.imports.set('file-with-dash.ts', [
        {
          source: './special_chars',
          imported: ['test'],
          usedBy: ['func']
        }
      ]);

      const result = getFileImports(testIndex, 'file-with-dash.ts');
      expect(result).not.toBeNull();
    });

    it('should handle special characters in module names', () => {
      testIndex.imports.set('test.ts', [
        {
          source: '@scope/package',
          imported: ['thing'],
          usedBy: ['func']
        }
      ]);

      const results = findImporters(testIndex, '@scope/package');
      expect(results).toHaveLength(1);
    });

    it('should handle empty imported array', () => {
      testIndex.imports.set('empty-imports.ts', [
        {
          source: './module',
          imported: [],
          usedBy: ['func']
        }
      ]);

      const result = getFileImports(testIndex, 'empty-imports.ts');
      expect(result?.imports[0].imported).toEqual([]);
    });

    it('should handle empty usedBy array', () => {
      testIndex.imports.set('unused.ts', [
        {
          source: './module',
          imported: ['something'],
          usedBy: []
        }
      ]);

      const result = getFileImports(testIndex, 'unused.ts');
      expect(result?.imports[0].usedBy).toEqual([]);
    });

    it('should handle relative imports with ../', () => {
      testIndex.imports.set('nested/file.ts', [
        {
          source: '../utils',
          imported: ['helper'],
          usedBy: ['func']
        }
      ]);

      const results = findImporters(testIndex, 'utils');
      expect(results).toHaveLength(1);
    });
  });
});
