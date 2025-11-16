/**
 * File storage for plans and embeddings
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';

import * as yaml from 'js-yaml';
import { pack, unpack } from 'msgpackr';

import type { Plan, Task, EmbeddingCache } from '../types.js';

import { createValidationError, createFileError, isCCDevToolsError } from '../../shared/errors.js';
import { ErrorCodes } from '../../shared/types/errors.js';

/**
 * Get path helpers (evaluated at runtime for test isolation)
 */
function getPlansDir(): string {
  return join(process.cwd(), 'cc-devtools', 'plans');
}

function getEmbeddingsFile(): string {
  return join(process.cwd(), 'cc-devtools', '.cache', 'planner-embeddings.msgpack');
}

/**
 * Ensure plans directory and cache directory exist
 */
function ensureDir(): void {
  const plansDir = getPlansDir();
  if (!existsSync(plansDir)) {
    mkdirSync(plansDir, { recursive: true });
  }

  const cacheDir = join(process.cwd(), 'cc-devtools', '.cache');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Validate plan structure
 */
function validatePlan(data: unknown): Plan {
  if (!data || typeof data !== 'object') {
    throw createValidationError('Plan must be an object');
  }

  const plan = data as Record<string, unknown>;

  if (typeof plan.id !== 'string' || !plan.id) {
    throw createValidationError('Plan id must be a non-empty string');
  }

  if (typeof plan.status !== 'string' || !['planning', 'in_progress', 'completed', 'on_hold', 'abandoned'].includes(plan.status)) {
    throw createValidationError('Plan status must be one of: planning, in_progress, completed, on_hold, abandoned');
  }

  if (typeof plan.summary !== 'string') {
    throw createValidationError('Plan summary must be a string');
  }

  if (typeof plan.goal !== 'string') {
    throw createValidationError('Plan goal must be a string');
  }

  if (typeof plan.decisions !== 'string') {
    throw createValidationError('Plan decisions must be a string');
  }

  if (typeof plan.implementation_plan !== 'string') {
    throw createValidationError('Plan implementation_plan must be a string');
  }

  if (!Array.isArray(plan.tasks)) {
    throw createValidationError('Plan tasks must be an array');
  }

  const tasks: Task[] = plan.tasks.map((task, idx) => {
    if (!task || typeof task !== 'object') {
      throw createValidationError(`Task at index ${idx} must be an object`);
    }

    const t = task as Record<string, unknown>;

    if (typeof t.summary !== 'string' || !t.summary) {
      throw createValidationError(`Task at index ${idx} must have a non-empty summary`);
    }

    if (t.details !== undefined && typeof t.details !== 'string') {
      throw createValidationError(`Task at index ${idx} details must be a string if provided`);
    }

    if (typeof t.status !== 'string' || !['pending', 'in_progress', 'completed'].includes(t.status)) {
      throw createValidationError(`Task at index ${idx} status must be one of: pending, in_progress, completed`);
    }

    return {
      summary: t.summary,
      details: t.details,
      status: t.status as Task['status']
    };
  });

  if (typeof plan.notes !== 'string') {
    throw createValidationError('Plan notes must be a string');
  }

  if (typeof plan.created_at !== 'number') {
    throw createValidationError('Plan created_at must be a number');
  }

  if (typeof plan.updated_at !== 'number') {
    throw createValidationError('Plan updated_at must be a number');
  }

  return {
    id: plan.id,
    status: plan.status as Plan['status'],
    summary: plan.summary,
    goal: plan.goal,
    decisions: plan.decisions,
    implementation_plan: plan.implementation_plan,
    tasks,
    notes: plan.notes,
    created_at: plan.created_at,
    updated_at: plan.updated_at
  };
}

/**
 * Scan all plan files in plans/ directory
 */
export function scanPlanFiles(): string[] {
  ensureDir();

  try {
    return readdirSync(getPlansDir())
      .filter(f => f.endsWith('.yaml'))
      .map(f => f.replace(/\.yaml$/, ''));
  } catch (_error) {
    return [];
  }
}

/**
 * Read a single plan from YAML file
 */
export function readPlan(id: string): Plan | null {
  ensureDir();

  const filePath = join(getPlansDir(), `${id}.yaml`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = yaml.load(content);
    return validatePlan(data);
  } catch (error) {
    // Rethrow validation errors directly
    if (isCCDevToolsError(error) && error.code === ErrorCodes.VALIDATION_FAILED) {
      throw error;
    }
    // Wrap file I/O errors
    throw createFileError(`Failed to read plan ${id}`, error as Error);
  }
}

/**
 * Read all plans from YAML files
 */
export function readAllPlans(): Plan[] {
  const ids = scanPlanFiles();
  const plans: Plan[] = [];

  for (const id of ids) {
    try {
      const plan = readPlan(id);
      if (plan) {
        plans.push(plan);
      }
    } catch (_error) {
      // Skip invalid plan files
    }
  }

  return plans;
}

/**
 * Save a plan to YAML file
 */
export function savePlan(plan: Plan): void {
  ensureDir();

  try {
    const content = yaml.dump(plan, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });

    const filePath = join(getPlansDir(), `${plan.id}.yaml`);
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw createFileError(`Failed to save plan ${plan.id}`, error as Error);
  }
}

/**
 * Check if a plan exists
 */
export function planExists(id: string): boolean {
  ensureDir();
  const filePath = join(getPlansDir(), `${id}.yaml`);
  return existsSync(filePath);
}

/**
 * Delete a plan file
 */
export function deletePlan(id: string): boolean {
  ensureDir();
  const filePath = join(getPlansDir(), `${id}.yaml`);

  if (!existsSync(filePath)) {
    return false;
  }

  try {
    unlinkSync(filePath);
    return true;
  } catch (error) {
    throw createFileError(`Failed to delete plan ${id}`, error as Error);
  }
}

/**
 * Read embeddings from cache file
 */
export function readEmbeddings(): EmbeddingCache {
  const embeddingsFile = getEmbeddingsFile();
  if (!existsSync(embeddingsFile)) {
    return {};
  }

  try {
    const buffer = readFileSync(embeddingsFile);
    return unpack(buffer) as EmbeddingCache;
  } catch (_error) {
    return {};
  }
}

/**
 * Save embeddings to cache file
 */
export function saveEmbeddings(embeddings: EmbeddingCache): void {
  const embeddingsFile = getEmbeddingsFile();

  try {
    const cacheDir = dirname(embeddingsFile);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const packed = pack(embeddings);
    writeFileSync(embeddingsFile, packed);
  } catch (error) {
    throw createFileError(`Failed to save ${embeddingsFile}`, error as Error);
  }
}
