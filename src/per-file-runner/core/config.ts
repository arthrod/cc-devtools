/**
 * Configuration file management
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import yaml from 'js-yaml';

import type { PerFileRunnerConfig, ConfigFile } from '../types.js';

const CONFIG_DIR = 'cc-devtools';
const CONFIG_FILE = 'per-file-runner.yaml';

/**
 * Get config file path
 */
export function getConfigPath(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Load configuration from YAML file
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<PerFileRunnerConfig[]> {
  const configPath = getConfigPath(cwd);

  if (!existsSync(configPath)) {
    return [];
  }

  const content = await readFile(configPath, 'utf-8');
  const parsed = yaml.load(content) as ConfigFile;

  if (!parsed || !Array.isArray(parsed.configs)) {
    throw new Error('Invalid config file format: expected { configs: [...] }');
  }

  return parsed.configs;
}

/**
 * Save configuration to YAML file
 */
export async function saveConfig(configs: PerFileRunnerConfig[], cwd: string = process.cwd()): Promise<void> {
  const configPath = getConfigPath(cwd);
  const dir = join(cwd, CONFIG_DIR);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const configFile: ConfigFile = { configs };
  const content = yaml.dump(configFile, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  await writeFile(configPath, content, 'utf-8');
}

/**
 * Get a specific config by ID
 */
export async function getConfigById(id: string, cwd: string = process.cwd()): Promise<PerFileRunnerConfig | null> {
  const configs = await loadConfig(cwd);
  return configs.find(c => c.id === id) ?? null;
}

/**
 * Validate config structure
 */
export function validateConfig(config: unknown): config is PerFileRunnerConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.prompt === 'string' &&
    typeof c.priority === 'number' &&
    typeof c.glob === 'object' &&
    c.glob !== null &&
    typeof c.command === 'string' &&
    Array.isArray(c.args) &&
    typeof c.timeout === 'number'
  );
}
