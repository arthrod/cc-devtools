/**
 * Main runner service for per-file-runner
 */

import { existsSync } from 'fs';
import { join } from 'path';

import { executeCommand } from '../core/executor.js';
import { findMatchingFiles } from '../core/file-matcher.js';
import { calculateFileHash } from '../core/hash.js';
import { log } from '../core/logger.js';
import { getStateForConfig, updateStateForConfig, updateFileHash } from '../core/state.js';
import type { PerFileRunnerConfig, FileState, FileStatus, RunResult, ProgressCallback } from '../types.js';

/**
 * Determine file status based on hash comparison
 */
function determineFileStatus(
  _file: string,
  currentHash: string,
  previousState: FileState | undefined
): FileStatus {
  if (!previousState?.last_hash) {
    return 'new';
  }

  if (previousState.last_hash === currentHash) {
    return 'up-to-date';
  }

  return 'out-of-date';
}

/**
 * Update current files with glob results and calculate statuses
 */
export async function updateCurrentFiles(
  config: PerFileRunnerConfig,
  cwd: string = process.cwd()
): Promise<FileState[]> {
  const matchedFiles = await findMatchingFiles(config.glob, cwd);
  const previousState = await getStateForConfig(config.id, cwd);
  const previousFileMap = new Map(previousState.currentFiles.map(f => [f.file, f]));

  const updatedFiles: FileState[] = [];

  for (const file of matchedFiles) {
    const fullPath = join(cwd, file);

    if (!existsSync(fullPath)) {
      continue;
    }

    const currentHash = await calculateFileHash(fullPath);
    const previousFileState = previousFileMap.get(file);
    const status = determineFileStatus(file, currentHash, previousFileState);

    updatedFiles.push({
      file,
      last_hash: previousFileState?.last_hash ?? null,
      last_state: status,
    });
  }

  await updateStateForConfig(config.id, updatedFiles, cwd);
  return updatedFiles;
}

/**
 * Get files that need processing (new or out-of-date)
 */
export function getFilesToProcess(files: FileState[]): FileState[] {
  return files.filter(f => f.last_state === 'new' || f.last_state === 'out-of-date');
}

/**
 * Sort files by status priority (new first, then out-of-date)
 */
export function sortFilesByPriority(files: FileState[]): FileState[] {
  return [...files].sort((a, b) => {
    if (a.last_state === 'new' && b.last_state !== 'new') return -1;
    if (a.last_state !== 'new' && b.last_state === 'new') return 1;
    return a.file.localeCompare(b.file);
  });
}

/**
 * Run command on all files that need processing
 */
export async function runConfig(
  config: PerFileRunnerConfig,
  dryRun: boolean = false,
  cwd: string = process.cwd(),
  options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }
): Promise<RunResult> {
  log(`Running config: ${config.name} (${config.id})`);

  const currentFiles = await updateCurrentFiles(config, cwd);
  const filesToProcess = getFilesToProcess(currentFiles);
  const sortedFiles = sortFilesByPriority(filesToProcess);

  if (sortedFiles.length === 0) {
    log('All files are up-to-date');
    return {
      configId: config.id,
      filesProcessed: 0,
      filesSucceeded: 0,
      filesFailed: 0,
    };
  }

  log(`Found ${sortedFiles.length} files to process`);

  let filesProcessed = 0;
  let filesSucceeded = 0;
  let filesFailed = 0;

  for (const fileState of sortedFiles) {
    // Check for cancellation
    if (options?.signal?.aborted) {
      log(`Config ${config.id} was cancelled`);
      return {
        configId: config.id,
        filesProcessed,
        filesSucceeded,
        filesFailed,
        error: 'Cancelled by user',
      };
    }

    const fullPath = join(cwd, fileState.file);
    const startTime = Date.now();

    // Notify file start
    options?.onProgress?.onFileStart?.(fileState.file);

    const result = await executeCommand(config, fileState.file, dryRun);
    const duration = Date.now() - startTime;

    filesProcessed++;

    if (result.success) {
      filesSucceeded++;

      if (!dryRun) {
        const newHash = await calculateFileHash(fullPath);
        await updateFileHash(config.id, fileState.file, newHash, cwd);
      }

      // Notify file success
      options?.onProgress?.onFileSuccess?.(fileState.file, duration, result.output);
    } else {
      filesFailed++;

      // Notify file error
      options?.onProgress?.onFileError?.(fileState.file, result.error ?? 'Unknown error', result.output);

      return {
        configId: config.id,
        filesProcessed,
        filesSucceeded,
        filesFailed,
        failedFile: fileState.file,
        error: result.error,
      };
    }
  }

  log(`Config ${config.id} completed successfully`);

  return {
    configId: config.id,
    filesProcessed,
    filesSucceeded,
    filesFailed,
  };
}

/**
 * Get status for all files in a config
 */
export async function getConfigStatus(
  config: PerFileRunnerConfig,
  cwd: string = process.cwd()
): Promise<FileState[]> {
  return await updateCurrentFiles(config, cwd);
}
