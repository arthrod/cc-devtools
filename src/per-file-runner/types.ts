/**
 * Types for per-file-runner module
 */

export type FileStatus = 'new' | 'out-of-date' | 'up-to-date';

export interface GlobPattern {
  include: string[];
  exclude?: string[];
}

export interface PerFileRunnerConfig {
  id: string;
  name: string;
  prompt: string;
  priority: number;
  glob: GlobPattern;
  command: string;
  args: string[];
  timeout: number;
}

export interface FileState {
  file: string;
  last_hash: string | null;
  last_state: FileStatus;
}

export interface ConfigState {
  id: string;
  currentFiles: FileState[];
}

export interface ConfigFile {
  configs: PerFileRunnerConfig[];
}

export interface StateFile {
  states: ConfigState[];
}

export interface FileProcessResult {
  file: string;
  success: boolean;
  error?: string;
}

export interface RunResult {
  configId: string;
  filesProcessed: number;
  filesSucceeded: number;
  filesFailed: number;
  failedFile?: string;
  error?: string;
}

/**
 * Progress callback for file processing
 */
export interface ProgressCallback {
  onFileStart?: (file: string) => void;
  onFileSuccess?: (file: string, duration: number, output?: string) => void;
  onFileError?: (file: string, error: string, output?: string) => void;
}
