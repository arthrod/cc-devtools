/**
 * Per-file-runner CLI command handler
 */

import { loadConfig, getConfigById } from '../../../per-file-runner/core/config.js';
import { log, logError, logWaiting } from '../../../per-file-runner/core/logger.js';
import { resetConfigState, resetFileState } from '../../../per-file-runner/core/state.js';
import { runConfig, getConfigStatus } from '../../../per-file-runner/services/runner.js';
import { parseArgs, getOption } from '../../core/parser.js';

import type { FileState } from '../../../per-file-runner/types.js';

const HELP_TEXT = `
Per-file-runner - Run commands on files matching glob patterns with state tracking

Usage:
  npx cc-devtools per-file-runner <command> [arguments] [options]

Commands:
  run <id> [options]              Run command for a specific config
    --dry-run                     Show what would be executed without running

  run-all [options]               Run commands for all configs (in priority order)
    --dry-run                     Show what would be executed without running

  status <id>                     Show status of files for a specific config

  status-all                      Show status of files for all configs

  automatic                       Run run-all on repeat
                                  - Success: wait 1 minute, retry
                                  - Failure: wait 1 hour, retry

  reset <id>                      Reset state for a config (clear all file hashes)

  reset-file <id> <file>          Reset state for a specific file in a config

Examples:
  npx cc-devtools per-file-runner run my-config
  npx cc-devtools per-file-runner run my-config --dry-run
  npx cc-devtools per-file-runner run-all
  npx cc-devtools per-file-runner status my-config
  npx cc-devtools per-file-runner status-all
  npx cc-devtools per-file-runner automatic
  npx cc-devtools per-file-runner reset my-config
  npx cc-devtools per-file-runner reset-file my-config src/index.ts
`;

/**
 * Run command for a specific config
 */
async function runCommand(positional: string[], options: Record<string, string | boolean>): Promise<void> {
  if (positional.length === 0) {
    console.error('Error: Missing config ID. Usage: run <id>');
    process.exit(1);
  }

  const configId = positional[0];
  const dryRun = getOption(options, 'dry-run', false);
  const config = await getConfigById(configId);

  if (!config) {
    console.error(`Error: Config with ID '${configId}' not found`);
    process.exit(1);
  }

  const result = await runConfig(config, Boolean(dryRun));

  if (result.filesFailed > 0) {
    process.exit(1);
  }
}

/**
 * Run all configs in priority order
 */
async function runAllCommand(_positional: string[], options: Record<string, string | boolean>): Promise<void> {
  const dryRun = getOption(options, 'dry-run', false);
  const configs = await loadConfig();

  if (configs.length === 0) {
    console.error('Error: No configs found in cc-devtools/per-file-runner.yaml');
    process.exit(1);
  }

  const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority);

  log(`Running ${sortedConfigs.length} configs in priority order`);

  for (const config of sortedConfigs) {
    const result = await runConfig(config, Boolean(dryRun));

    if (result.filesFailed > 0) {
      logError(`Config ${config.id} failed, stopping run-all`);
      process.exit(1);
    }
  }

  log('All configs completed successfully');
}

/**
 * Show status for a specific config
 */
async function statusCommand(positional: string[], _options: Record<string, string | boolean>): Promise<void> {
  if (positional.length === 0) {
    console.error('Error: Missing config ID. Usage: status <id>');
    process.exit(1);
  }

  const configId = positional[0];
  const config = await getConfigById(configId);

  if (!config) {
    console.error(`Error: Config with ID '${configId}' not found`);
    process.exit(1);
  }

  const files = await getConfigStatus(config);

  console.log(`\nStatus for config: ${config.name} (${config.id})`);
  console.log('='.repeat(60));

  if (files.length === 0) {
    console.log('No files found matching glob pattern');
    return;
  }

  const groupedByStatus: Record<string, FileState[]> = {
    'new': [],
    'out-of-date': [],
    'up-to-date': [],
  };

  for (const file of files) {
    groupedByStatus[file.last_state].push(file);
  }

  for (const status of ['new', 'out-of-date', 'up-to-date']) {
    const statusFiles = groupedByStatus[status];
    if (statusFiles.length > 0) {
      console.log(`\n${status.toUpperCase()} (${statusFiles.length}):`);
      for (const file of statusFiles) {
        console.log(`  - ${file.file}`);
      }
    }
  }

  console.log('');
}

/**
 * Show status for all configs
 */
async function statusAllCommand(_positional: string[], _options: Record<string, string | boolean>): Promise<void> {
  const configs = await loadConfig();

  if (configs.length === 0) {
    console.error('Error: No configs found in cc-devtools/per-file-runner.yaml');
    process.exit(1);
  }

  for (const config of configs) {
    await statusCommand([config.id], {});
  }
}

/**
 * Automatic mode - run-all on repeat with retry logic
 */
async function automaticCommand(_positional: string[], _options: Record<string, string | boolean>): Promise<void> {
  log('Starting automatic mode');
  log('Will run all configs on repeat');
  log('Success: retry in 1 minute | Failure: retry in 1 hour');

  const ONE_MINUTE = 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const configs = await loadConfig();

    if (configs.length === 0) {
      logError('No configs found, waiting 1 hour before retrying');
      logWaiting('1 hour');
      await new Promise(resolve => setTimeout(resolve, ONE_HOUR));
      continue;
    }

    const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority);
    let failed = false;

    for (const config of sortedConfigs) {
      const result = await runConfig(config, false);

      if (result.filesFailed > 0) {
        logError(`Config ${config.id} failed`);
        failed = true;
        break;
      }
    }

    if (failed) {
      logWaiting('1 hour');
      await new Promise(resolve => setTimeout(resolve, ONE_HOUR));
    } else {
      log('All configs completed successfully');
      logWaiting('1 minute');
      await new Promise(resolve => setTimeout(resolve, ONE_MINUTE));
    }
  }
}

/**
 * Reset state for a config
 */
async function resetCommand(positional: string[], _options: Record<string, string | boolean>): Promise<void> {
  if (positional.length === 0) {
    console.error('Error: Missing config ID. Usage: reset <id>');
    process.exit(1);
  }

  const configId = positional[0];
  const config = await getConfigById(configId);

  if (!config) {
    console.error(`Error: Config with ID '${configId}' not found`);
    process.exit(1);
  }

  await resetConfigState(configId);
  log(`Reset state for config: ${config.name} (${config.id})`);
}

/**
 * Reset state for a specific file
 */
async function resetFileCommand(positional: string[], _options: Record<string, string | boolean>): Promise<void> {
  if (positional.length < 2) {
    console.error('Error: Missing arguments. Usage: reset-file <id> <file>');
    process.exit(1);
  }

  const configId = positional[0];
  const filePath = positional[1];
  const config = await getConfigById(configId);

  if (!config) {
    console.error(`Error: Config with ID '${configId}' not found`);
    process.exit(1);
  }

  await resetFileState(configId, filePath);
  log(`Reset state for file: ${filePath} in config ${config.id}`);
}

const COMMANDS: Record<string, (pos: string[], opt: Record<string, string | boolean>) => Promise<void>> = {
  'run': runCommand,
  'run-all': runAllCommand,
  'status': statusCommand,
  'status-all': statusAllCommand,
  'automatic': automaticCommand,
  'reset': resetCommand,
  'reset-file': resetFileCommand,
};

/**
 * Main per-file-runner command handler
 */
export async function perFileRunnerCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const { command, positional, options } = parseArgs(args);

  if (!command) {
    console.log(HELP_TEXT);
    process.exit(1);
  }

  const handler = COMMANDS[command];

  if (!handler) {
    console.error(`Error: Unknown command '${command}'`);
    console.log(HELP_TEXT);
    process.exit(1);
  }

  try {
    await handler(positional, options);
  } catch (error) {
    logError((error as Error).message);
    process.exit(1);
  }
}
