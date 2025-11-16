/**
 * Plan store tool implementation
 */

import { join } from 'path';

import { generatePlanEmbedding } from '../core/embeddings.js';
import { planExists, savePlan, readEmbeddings, saveEmbeddings } from '../core/storage.js';
import type { StoreResponse, StoreArgs } from '../types.js';

import { createValidationError, createAlreadyExistsError } from '../../shared/errors.js';
import { withLock } from '../../shared/file-lock.js';

const EMBEDDINGS_FILE = join(process.cwd(), 'cc-devtools', '.cache', 'planner-embeddings.yaml');

/**
 * Store a new plan
 */
export async function storePlan(args: StoreArgs): Promise<StoreResponse> {
  const { id, summary, goal, decisions, implementation_plan, tasks } = args;

  if (!id || typeof id !== 'string') {
    throw createValidationError('Plan id is required and must be a non-empty string');
  }

  if (!summary || typeof summary !== 'string') {
    throw createValidationError('Plan summary is required and must be a string');
  }

  if (!goal || typeof goal !== 'string') {
    throw createValidationError('Plan goal is required and must be a string');
  }

  if (typeof decisions !== 'string') {
    throw createValidationError('Plan decisions is required and must be a string (can be empty)');
  }

  if (typeof implementation_plan !== 'string') {
    throw createValidationError('Plan implementation_plan is required and must be a string (can be empty)');
  }

  if (!Array.isArray(tasks)) {
    throw createValidationError('Plan tasks is required and must be an array (can be empty)');
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    if (!task || typeof task !== 'object') {
      throw createValidationError(`Task at index ${i} must be an object`);
    }

    if (!task.summary || typeof task.summary !== 'string') {
      throw createValidationError(`Task at index ${i} must have a non-empty summary`);
    }

    if (task.details !== undefined && typeof task.details !== 'string') {
      throw createValidationError(`Task at index ${i} details must be a string if provided`);
    }

    const status = task.status ?? 'pending';
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      throw createValidationError(`Task at index ${i} status must be one of: pending, in_progress, completed`);
    }

    tasks[i].status = status;
  }

  return await withLock(EMBEDDINGS_FILE, async () => {
    if (planExists(id)) {
      throw createAlreadyExistsError(`Plan with id "${id}" already exists. Choose a different id or use plan_update to modify the existing plan.`);
    }

      const now = Date.now();
      const plan = {
        id,
        status: 'planning' as const,
        summary,
        goal,
        decisions,
        implementation_plan,
        tasks: tasks.map(t => ({
          summary: t.summary,
          details: t.details,
          status: t.status ?? 'pending' as const
        })),
        notes: '',
        created_at: now,
        updated_at: now
      };

      let warning: string | undefined;

      try {
        const embedding = await generatePlanEmbedding(plan);

        if (embedding) {
          const embeddings = readEmbeddings();
          embeddings[id] = embedding;
          saveEmbeddings(embeddings);
        } else {
          warning = 'Failed to generate embedding. Plan will only be keyword-searchable until embedding is regenerated.';
        }
      } catch (_error) {
        warning = 'Failed to generate embedding. Plan will only be keyword-searchable until embedding is regenerated.';
      }

      savePlan(plan);

    return {
      success: true,
      id,
      warning
    };
  });
}
