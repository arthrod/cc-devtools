/**
 * Git status service
 * Provides Git repository status information with caching
 */

import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

import * as logger from '../utils/logger.js';

import type { GitFileStatus, GitStatusResponse, GitStatusType } from '../../shared/types/git.js';

const execAsync = promisify(exec);

export class GitStatusService {
  private projectRoot: string;
  private statusCache: Map<string, GitFileStatus> = new Map();
  private lastUpdateTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Get Git status for all files in the repository
   */
  async getGitStatus(): Promise<GitStatusResponse> {
    const now = Date.now();

    // Use cache if recent
    if (now - this.lastUpdateTime < this.CACHE_DURATION && this.statusCache.size > 0) {
      return this.buildResultFromCache();
    }

    try {
      // Check if it's a git repository
      const isRepo = await this.isGitRepository();
      if (!isRepo) {
        return {
          files: [],
          branch: null,
          hasChanges: false,
          isGitRepo: false
        };
      }

      const [statusOutput, branchOutput] = await Promise.all([
        this.getGitStatusOutput(),
        this.getCurrentBranch()
      ]);

      const files = this.parseGitStatus(statusOutput);
      this.updateCache(files);
      this.lastUpdateTime = now;

      return {
        files,
        branch: branchOutput,
        hasChanges: files.length > 0,
        isGitRepo: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get git status:', errorMessage);
      return {
        files: [],
        branch: null,
        hasChanges: false,
        isGitRepo: false
      };
    }
  }

  /**
   * Get Git status for a specific file
   */
  async getFileStatus(filePath: string): Promise<GitFileStatus | null> {
    const relativePath = path.relative(this.projectRoot, filePath);

    // Check cache first
    if (this.statusCache.has(relativePath)) {
      return this.statusCache.get(relativePath) ?? null;
    }

    // Refresh status if not in cache
    await this.getGitStatus();
    return this.statusCache.get(relativePath) ?? null;
  }

  /**
   * Check if the current directory is a Git repository
   */
  private async isGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.projectRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  private async getCurrentBranch(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.projectRoot });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Get git status output using porcelain format
   */
  private async getGitStatusOutput(): Promise<string> {
    const { stdout } = await execAsync('git status --porcelain=v1', { cwd: this.projectRoot });
    return stdout;
  }

  /**
   * Parse git status porcelain output
   */
  private parseGitStatus(output: string): GitFileStatus[] {
    const files: GitFileStatus[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.length < 3) continue;

      const stagedChar = line[0] ?? ' ';
      const unstagedChar = line[1] ?? ' ';
      const filePath = line.substring(3) ?? '';

      const status = this.determineFileStatus(stagedChar, unstagedChar);
      const staged = stagedChar !== ' ' && stagedChar !== '?';
      const unstaged = unstagedChar !== ' ';

      files.push({
        path: filePath,
        status,
        staged,
        unstaged
      });
    }

    return files;
  }

  /**
   * Determine file status from git status characters
   */
  private determineFileStatus(stagedChar: string, unstagedChar: string): GitStatusType {
    // Handle conflicted files first
    if (stagedChar === 'U' || unstagedChar === 'U' ||
        (stagedChar === 'A' && unstagedChar === 'A') ||
        (stagedChar === 'D' && unstagedChar === 'D')) {
      return 'conflicted';
    }

    // Handle untracked files
    if (stagedChar === '?' && unstagedChar === '?') {
      return 'untracked';
    }

    // Handle ignored files
    if (stagedChar === '!' && unstagedChar === '!') {
      return 'ignored';
    }

    // Prioritize unstaged changes
    if (unstagedChar !== ' ') {
      switch (unstagedChar) {
        case 'M': return 'modified';
        case 'D': return 'deleted';
        case 'A': return 'added';
        case 'R': return 'renamed';
        case 'C': return 'copied';
        default: return 'modified';
      }
    }

    // Handle staged changes
    if (stagedChar !== ' ') {
      switch (stagedChar) {
        case 'M': return 'modified';
        case 'D': return 'deleted';
        case 'A': return 'added';
        case 'R': return 'renamed';
        case 'C': return 'copied';
        default: return 'modified';
      }
    }

    return 'clean';
  }

  /**
   * Update the internal cache with new file statuses
   */
  private updateCache(files: GitFileStatus[]): void {
    this.statusCache.clear();
    for (const file of files) {
      this.statusCache.set(file.path, file);
    }
  }

  /**
   * Build result from cached data
   */
  private buildResultFromCache(): GitStatusResponse {
    const files = Array.from(this.statusCache.values());
    return {
      files,
      branch: null, // Branch info not cached
      hasChanges: files.length > 0,
      isGitRepo: true
    };
  }

  /**
   * Clear the cache (useful for forcing refresh)
   */
  public clearCache(): void {
    this.statusCache.clear();
    this.lastUpdateTime = 0;
  }

  /**
   * Check if a file has uncommitted changes
   */
  public async hasUncommittedChanges(filePath: string): Promise<boolean> {
    const status = await this.getFileStatus(filePath);
    return status !== null && status.status !== 'clean';
  }

  /**
   * Get all files with a specific status
   */
  public async getFilesByStatus(statusType: GitStatusType): Promise<GitFileStatus[]> {
    const result = await this.getGitStatus();
    return result.files.filter(file => file.status === statusType);
  }
}
