/**
 * Command execution utilities
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';

import which from 'which';

import type { PerFileRunnerConfig } from '../types.js';

import { logProcessingFile, logProcessingSuccess, logProcessingFailure } from './logger.js';

const PROMPT_PLACEHOLDER = '___PROMPT___';
const FILENAME_PLACEHOLDER = '{filename}';

/**
 * Cache for resolved command paths to avoid repeated lookups
 */
const commandPathCache = new Map<string, string>();

/**
 * Expand ~ to home directory in paths
 */
function expandTilde(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return filepath.replace('~', homedir());
  }
  return filepath;
}

/**
 * Resolve command to full path using which or direct path
 * Caches results for performance
 */
async function resolveCommand(command: string): Promise<string> {
  if (commandPathCache.has(command)) {
    return commandPathCache.get(command)!;
  }

  // Expand ~ in the command path
  const expandedCommand = expandTilde(command);

  // If it's an absolute path or starts with ./ or ../, check if it exists
  if (expandedCommand.startsWith('/') || expandedCommand.startsWith('./') || expandedCommand.startsWith('../')) {
    if (existsSync(expandedCommand)) {
      commandPathCache.set(command, expandedCommand);
      return expandedCommand;
    }
    throw new Error(`Command not found: ${command}. File does not exist at path: ${expandedCommand}`);
  }

  // Otherwise try to resolve via which (for commands in PATH)
  try {
    const resolved = await which(expandedCommand);
    commandPathCache.set(command, resolved);
    return resolved;
  } catch {
    throw new Error(`Command not found: ${command}. Please ensure it is installed and in your PATH.`);
  }
}

/**
 * Execute command for a single file
 */
export async function executeCommand(
  config: PerFileRunnerConfig,
  file: string,
  dryRun: boolean = false
): Promise<{ success: boolean; error?: string; output?: string }> {
  const prompt = config.prompt.replace(FILENAME_PLACEHOLDER, file);
  const args = config.args.map(arg => arg.replace(PROMPT_PLACEHOLDER, prompt));

  logProcessingFile(file, config.command);

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[DRY RUN] Would execute: ${config.command} ${args.join(' ')}`);
    logProcessingSuccess(file);
    return { success: true };
  }

  // Resolve command to full path to avoid shell injection and PATH issues
  let resolvedCommand: string;
  try {
    resolvedCommand = await resolveCommand(config.command);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logProcessingFailure(file, errorMsg);
    return { success: false, error: errorMsg };
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(resolvedCommand, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: config.timeout,
      shell: false,
      env: process.env,
    });

    child.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      // Also log to console for debugging
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      // Also log to console for debugging
      process.stderr.write(chunk);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        logProcessingSuccess(file);
        resolve({ success: true, output: stdout.trim() });
      } else {
        const error = stderr.trim() || `Command exited with code ${code ?? 'unknown'}`;
        logProcessingFailure(file, error);
        resolve({ success: false, error, output: stdout.trim() });
      }
    });

    child.on('error', (err) => {
      const error = err.message;
      logProcessingFailure(file, error);
      resolve({ success: false, error });
    });
  });
}
