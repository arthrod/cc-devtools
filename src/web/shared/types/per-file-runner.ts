/**
 * Shared types for Per-File-Runner API
 * Used by both server and client
 */

import type { ErrorResponse as SharedErrorResponse } from '../types.js';

import type { PerFileRunnerConfig, FileState, FileStatus, RunResult } from '../../../per-file-runner/types.js';

// Re-export core types for convenience
export type { PerFileRunnerConfig, FileState, FileStatus, RunResult };
export type ErrorResponse = Required<SharedErrorResponse>;

/**
 * Config status with file statistics
 */
export interface ConfigStatusSummary {
  configId: string;
  configName: string;
  priority: number;
  totalFiles: number;
  filesNew: number;
  filesOutOfDate: number;
  filesUpToDate: number;
  lastRun?: number;
  isRunning: boolean;
}

/**
 * Detailed config status with individual file states
 */
export interface ConfigStatusDetailed {
  configId: string;
  configName: string;
  priority: number;
  files: FileState[];
  lastRun?: number;
  isRunning: boolean;
}

/**
 * SSE event types for run progress
 */
export type SSEEvent =
  | { type: 'run-start'; data: SSERunStartData }
  | { type: 'file-start'; data: SSEFileStartData }
  | { type: 'file-success'; data: SSEFileSuccessData }
  | { type: 'file-error'; data: SSEFileErrorData }
  | { type: 'run-complete'; data: SSERunCompleteData }
  | { type: 'run-error'; data: SSERunErrorData };

export interface SSERunStartData {
  configId: string;
  configName: string;
  totalFiles: number;
}

export interface SSEFileStartData {
  file: string;
  index: number;
  total: number;
}

export interface SSEFileSuccessData {
  file: string;
  duration: number;
  output?: string;
}

export interface SSEFileErrorData {
  file: string;
  error: string;
  output?: string;
}

// @type-duplicate-allowed - SSE event is a subset of RunResult optimized for streaming updates
export interface SSERunCompleteData {
  filesProcessed: number;
  filesSucceeded: number;
  filesFailed: number;
}

export interface SSERunErrorData {
  error: string;
}

/**
 * Automatic mode status
 */
export interface AutomaticModeStatus {
  running: boolean;
  nextRunAt?: number;
  lastRunAt?: number;
  lastRunResult?: {
    success: boolean;
    filesProcessed: number;
    error?: string;
  };
  currentRun?: {
    configId: string;
    configName: string;
    progress: number;
    total: number;
  };
  overallProgress?: {
    filesProcessed: number;
    totalFiles: number;
  };
  runningConfigs: string[];
}

/**
 * API Request/Response types
 */

export interface CreateConfigRequest {
  config: PerFileRunnerConfig;
}

export interface UpdateConfigRequest {
  config: Partial<PerFileRunnerConfig>;
}

export interface ResetFileRequest {
  file: string;
}

export interface RunConfigRequest {
  dryRun?: boolean;
}

export interface PreviewFilesRequest {
  include: string[];
  exclude: string[];
}

export interface ConfigListResponse {
  configs: PerFileRunnerConfig[];
}

export interface ConfigResponse {
  config: PerFileRunnerConfig;
}

export interface StatusResponse {
  status: ConfigStatusDetailed;
}

export interface AllStatusesResponse {
  statuses: ConfigStatusSummary[];
}

export interface DeleteConfigResponse {
  success: boolean;
}

export interface ResetResponse {
  success: boolean;
}

export interface AutomaticModeResponse {
  status: AutomaticModeStatus;
}
