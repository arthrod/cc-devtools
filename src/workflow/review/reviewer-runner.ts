/**
 * Reviewer execution logic
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

import which from 'which';

import type { ReviewerResult, ReviewerConfig } from '../types/review.js';

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
 * Execute a reviewer CLI command with timeout
 */
export async function runReviewer(
  reviewerConfig: ReviewerConfig,
  promptFilePath: string,
  onProgress?: (message: string) => void
): Promise<ReviewerResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    onProgress?.(`Reviewer: ${reviewerConfig.name} - Starting review...`);

    // Read prompt file content directly instead of using shell substitution
    let promptContent: string;
    try {
      promptContent = readFileSync(promptFilePath, 'utf-8');
    } catch (error) {
      resolve({
        success: false,
        output: '',
        error: `Failed to read prompt file: ${error instanceof Error ? error.message : String(error)}`,
      });
      return;
    }

    // Replace ___PROMPT___ placeholder with actual prompt content
    const processedArgs = reviewerConfig.args.map((arg) => {
      if (arg === '___PROMPT___') {
        return promptContent;
      }
      return arg;
    });

    // Resolve command to full path to avoid shell injection and PATH issues
    void resolveCommand(reviewerConfig.command).then(
      (resolvedCommand) => {
        const child = spawn(resolvedCommand, processedArgs, {
          cwd: process.cwd(),
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: process.env,
        });

        let output = '';
        let errorOutput = '';
        let timedOut = false;

        const timeoutHandle = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');

          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }, reviewerConfig.timeout);

        child.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        child.on('close', (code) => {
          clearTimeout(timeoutHandle);
          const duration = ((Date.now() - startTime) / 1000).toFixed(0);

          if (timedOut) {
            onProgress?.(`Reviewer: ${reviewerConfig.name} - Timed out (${duration}s)`);
            resolve({ success: false, output, error: errorOutput, timedOut: true });
          } else if (code === 0) {
            onProgress?.(`Reviewer: ${reviewerConfig.name} - Completed review (${duration}s)`);
            resolve({ success: true, output });
          } else {
            onProgress?.(`Reviewer: ${reviewerConfig.name} - Failed review (${duration}s)`);
            resolve({ success: false, output, error: errorOutput });
          }
        });

        child.on('error', (error: Error) => {
          clearTimeout(timeoutHandle);
          resolve({ success: false, output, error: error.message });
        });
      },
      (error) => {
        resolve({
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );
  });
}
