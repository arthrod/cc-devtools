/**
 * State file management
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import yaml from 'js-yaml';

import type { ConfigState, FileState, StateFile } from '../types.js';

import { withLock } from '../../shared/file-lock.js';

const STATE_DIR = 'cc-devtools';
const STATE_FILE = 'per-file-runner-state.yaml';

/**
 * Get state file path
 */
export function getStatePath(cwd: string = process.cwd()): string {
  return join(cwd, STATE_DIR, STATE_FILE);
}

/**
 * Load state from YAML file (internal, no locking)
 */
async function loadStateUnsafe(cwd: string = process.cwd()): Promise<ConfigState[]> {
  const statePath = getStatePath(cwd);

  if (!existsSync(statePath)) {
    return [];
  }

  const content = await readFile(statePath, 'utf-8');
  const parsed = yaml.load(content) as StateFile;

  if (!parsed || !Array.isArray(parsed.states)) {
    throw new Error('Invalid state file format: expected { states: [...] }');
  }

  return parsed.states;
}

/**
 * Load state from YAML file (with file locking)
 */
export async function loadState(cwd: string = process.cwd()): Promise<ConfigState[]> {
  const statePath = getStatePath(cwd);
  return withLock(statePath, () => loadStateUnsafe(cwd));
}

/**
 * Save state to YAML file (internal, no locking)
 */
async function saveStateUnsafe(states: ConfigState[], cwd: string = process.cwd()): Promise<void> {
  const statePath = getStatePath(cwd);
  const dir = join(cwd, STATE_DIR);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const stateFile: StateFile = { states };
  const content = yaml.dump(stateFile, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  await writeFile(statePath, content, 'utf-8');
}

/**
 * Save state to YAML file (with file locking)
 */
export async function saveState(states: ConfigState[], cwd: string = process.cwd()): Promise<void> {
  const statePath = getStatePath(cwd);
  return withLock(statePath, () => saveStateUnsafe(states, cwd));
}

/**
 * Get state for a specific config ID
 */
export async function getStateForConfig(configId: string, cwd: string = process.cwd()): Promise<ConfigState> {
  const states = await loadState(cwd);
  const existing = states.find(s => s.id === configId);

  if (existing) {
    return existing;
  }

  return {
    id: configId,
    currentFiles: [],
  };
}

/**
 * Update state for a specific config (with file locking)
 */
export async function updateStateForConfig(
  configId: string,
  currentFiles: FileState[],
  cwd: string = process.cwd()
): Promise<void> {
  const statePath = getStatePath(cwd);

  await withLock(statePath, async () => {
    const states = await loadStateUnsafe(cwd);
    const index = states.findIndex(s => s.id === configId);

    const newState: ConfigState = {
      id: configId,
      currentFiles,
    };

    if (index >= 0) {
      states[index] = newState;
    } else {
      states.push(newState);
    }

    await saveStateUnsafe(states, cwd);
  });
}

/**
 * Update hash for a specific file in a config's state (with file locking)
 */
export async function updateFileHash(
  configId: string,
  filePath: string,
  hash: string,
  cwd: string = process.cwd()
): Promise<void> {
  const statePath = getStatePath(cwd);

  await withLock(statePath, async () => {
    const states = await loadStateUnsafe(cwd);
    const state = states.find(s => s.id === configId) ?? {
      id: configId,
      currentFiles: [],
    };

    const fileState = state.currentFiles.find(f => f.file === filePath);

    if (fileState) {
      fileState.last_hash = hash;
      fileState.last_state = 'up-to-date';
    }

    const index = states.findIndex(s => s.id === configId);
    if (index >= 0) {
      states[index] = state;
    } else {
      states.push(state);
    }

    await saveStateUnsafe(states, cwd);
  });
}

/**
 * Reset state for a config (clear all hashes)
 */
export async function resetConfigState(configId: string, cwd: string = process.cwd()): Promise<void> {
  await updateStateForConfig(configId, [], cwd);
}

/**
 * Reset state for a specific file in a config (with file locking)
 */
export async function resetFileState(
  configId: string,
  filePath: string,
  cwd: string = process.cwd()
): Promise<void> {
  const statePath = getStatePath(cwd);

  await withLock(statePath, async () => {
    const states = await loadStateUnsafe(cwd);
    const state = states.find(s => s.id === configId);

    if (state) {
      state.currentFiles = state.currentFiles.filter(f => f.file !== filePath);
      const index = states.findIndex(s => s.id === configId);
      if (index >= 0) {
        states[index] = state;
      }
      await saveStateUnsafe(states, cwd);
    }
  });
}
