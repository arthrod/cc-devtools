/**
 * Shared types for Git API
 * Used by both server and client
 */

export type GitStatusType =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'ignored'
  | 'conflicted'
  | 'clean';

export interface GitFileStatus {
  path: string;
  status: GitStatusType;
  staged: boolean;
  unstaged: boolean;
}

export interface GitStatusResponse {
  files: GitFileStatus[];
  branch: string | null;
  hasChanges: boolean;
  isGitRepo: boolean;
}

export interface GitFileStatusResponse {
  file: GitFileStatus | null;
}
