/**
 * File matching using glob patterns
 */

import { readdir } from 'fs/promises';
import { join, relative } from 'path';

import ignore from 'ignore';

import type { GlobPattern } from '../types.js';

/**
 * Convert glob pattern to regex-like matching function
 */
function globToMatcher(pattern: string): (path: string) => boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '§DOUBLESTAR§')
    .replace(/\*/g, '[^/]*')
    .replace(/§DOUBLESTAR§/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return (path: string) => regex.test(path);
}

/**
 * Recursively walk directory and collect all files
 */
async function walkDirectory(dir: string, baseDir: string, ig: ReturnType<typeof ignore>): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await walkDirectory(fullPath, baseDir, ig);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Find files matching glob pattern
 */
export async function findMatchingFiles(pattern: GlobPattern, cwd: string = process.cwd()): Promise<string[]> {
  const ig = ignore();

  if (pattern.exclude) {
    ig.add(pattern.exclude);
  }

  const allFiles = await walkDirectory(cwd, cwd, ig);
  const matchedFiles: Set<string> = new Set();

  for (const includePattern of pattern.include) {
    const matcher = globToMatcher(includePattern);

    for (const file of allFiles) {
      if (matcher(file)) {
        matchedFiles.add(file);
      }
    }
  }

  return Array.from(matchedFiles).sort();
}
