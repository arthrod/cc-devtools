/**
 * Review configuration loader
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { load as parseYaml } from 'js-yaml';

import type { ReviewConfig } from '../types/review.js';

/**
 * Default review configuration
 */
const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  version: 1,
  defaults: {
    timeout: 900000, // 15 minutes
    metadataDir: '.tmp',
    promptTemplate: 'default',
  },
  reviewers: [],
  review: {
    autoGenerate: true,
    autoCleanup: false,
    storage: {
      enabled: true,
      storeFalsePositives: true,
    },
  },
};

/**
 * Load review configuration from file or return defaults
 */
export function loadReviewConfig(configPath?: string): ReviewConfig {
  if (!configPath) {
    const defaultPath = join(process.cwd(), 'cc-devtools', 'workflow', 'reviewers.yaml');
    if (existsSync(defaultPath)) {
      configPath = defaultPath;
    } else {
      return DEFAULT_REVIEW_CONFIG;
    }
  }

  if (!existsSync(configPath)) {
    throw new Error(`Review config file not found: ${configPath}`);
  }

  try {
    const yamlContent = readFileSync(configPath, 'utf-8');
    const parsedConfig = parseYaml(yamlContent) as ReviewConfig;

    return {
      ...DEFAULT_REVIEW_CONFIG,
      ...parsedConfig,
      defaults: {
        ...DEFAULT_REVIEW_CONFIG.defaults,
        ...parsedConfig.defaults,
      },
      review: {
        ...DEFAULT_REVIEW_CONFIG.review,
        ...parsedConfig.review,
        storage: {
          ...DEFAULT_REVIEW_CONFIG.review.storage,
          ...parsedConfig.review?.storage,
        },
      },
      reviewers: parsedConfig.reviewers ?? [],
    };
  } catch (error) {
    throw new Error(`Failed to load review config: ${(error as Error).message}`);
  }
}

/**
 * Get enabled reviewers from config
 */
export function getEnabledReviewers(config: ReviewConfig): ReviewConfig['reviewers'] {
  return config.reviewers.filter((r) => r.enabled);
}

/**
 * Get default review configuration
 */
export function getDefaultReviewConfig(): ReviewConfig {
  return { ...DEFAULT_REVIEW_CONFIG };
}
