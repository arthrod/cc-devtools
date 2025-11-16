/**
 * Workflow configuration loader
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { load as parseYaml } from 'js-yaml';

import type { WorkflowConfig } from '../types/workflow.js';

/**
 * Default workflow configuration
 */
const DEFAULT_CONFIG: WorkflowConfig = {
  version: 1,
  decisionTree: {
    source: 'default',
  },
  logging: {
    enabled: true,
    file: 'workflow.log',
    level: 'info',
  },
  kanban: {
    mode: 'internal',
  },
};

/**
 * Load workflow configuration from file or return defaults
 */
export function loadWorkflowConfig(configPath?: string): WorkflowConfig {
  if (!configPath) {
    const defaultPath = join(process.cwd(), 'cc-devtools', 'workflow', 'config.yaml');
    if (existsSync(defaultPath)) {
      configPath = defaultPath;
    } else {
      return DEFAULT_CONFIG;
    }
  }

  if (!existsSync(configPath)) {
    throw new Error(`Workflow config file not found: ${configPath}`);
  }

  try {
    const yamlContent = readFileSync(configPath, 'utf-8');
    const parsedConfig = parseYaml(yamlContent) as WorkflowConfig;

    return {
      ...DEFAULT_CONFIG,
      ...parsedConfig,
      logging: {
        ...DEFAULT_CONFIG.logging,
        ...parsedConfig.logging,
      },
      decisionTree: {
        ...DEFAULT_CONFIG.decisionTree,
        ...parsedConfig.decisionTree,
      },
      kanban: {
        ...DEFAULT_CONFIG.kanban,
        ...parsedConfig.kanban,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to load workflow config: ${(error as Error).message}`
    );
  }
}

/**
 * Get default workflow configuration
 */
export function getDefaultConfig(): WorkflowConfig {
  return { ...DEFAULT_CONFIG };
}
