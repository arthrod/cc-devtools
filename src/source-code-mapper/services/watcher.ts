/**
 * File watcher with batched updates
 * Watches source files and triggers index updates on changes
 */

import { existsSync, readFileSync } from 'fs';
import { join, relative } from 'path';

import chokidar, { type FSWatcher } from 'chokidar';
import ignore from 'ignore';

import type { FileWatcher } from '../types.js';
import { STANDARD_IGNORE_PATTERNS } from '../types.js';

const BATCH_DELAY_MS = 1500;

export function createFileWatcher(
  directory: string,
  onChange: (files: string[]) => void
): FileWatcher {
  let watcher: FSWatcher | null = null;
  const pendingChanges = new Set<string>();
  let batchTimer: NodeJS.Timeout | null = null;

  function processBatch(): void {
    if (pendingChanges.size === 0) return;

    const files = Array.from(pendingChanges);
    pendingChanges.clear();
    onChange(files);
  }

  function queueChange(filePath: string): void {
    pendingChanges.add(filePath);

    if (batchTimer) {
      clearTimeout(batchTimer);
    }

    batchTimer = setTimeout(() => {
      processBatch();
      batchTimer = null;
    }, BATCH_DELAY_MS);
  }

  function start(): void {
    if (watcher) return;

    // Build ignore matcher using same logic as scanner for consistency
    const ig = ignore().add(STANDARD_IGNORE_PATTERNS);

    const gitignorePath = join(directory, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    }

    watcher = chokidar.watch(directory, {
      ignored: (path: string, stats) => {
        // Get path relative to watch root
        const rel = relative(directory, path);

        // Don't ignore the root or parent paths
        if (!rel || rel.startsWith('..')) return false;

        // Append trailing slash for directories (ignore package expects this)
        const candidate = stats?.isDirectory?.() ? `${rel}/` : rel;

        return ig.ignores(candidate);
      },
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    watcher.on('add', queueChange);
    watcher.on('change', queueChange);
    watcher.on('unlink', queueChange);
  }

  function stop(): void {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }

    if (watcher) {
      void watcher.close();
      watcher = null;
    }
  }

  return { start, stop };
}
