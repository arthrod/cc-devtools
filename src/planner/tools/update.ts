/**
 * Plan update tool implementation
 */

import { join } from 'path';

import { generatePlanEmbedding } from '../core/embeddings.js';
import { readPlan, savePlan, readEmbeddings, saveEmbeddings } from '../core/storage.js';
import type { UpdateResponse, UpdateArgs } from '../types.js';

import { createValidationError, createNotFoundError } from '../../shared/errors.js';
import { withLock } from '../../shared/file-lock.js';

const EMBEDDINGS_FILE = join(process.cwd(), 'cc-devtools', '.cache', 'planner-embeddings.yaml');

/**
 * Format current timestamp for notes
 */
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `[${year}-${month}-${day} ${hour}:${minute}]`;
}

/**
 * Update an existing plan
 */
export async function updatePlan(args: UpdateArgs): Promise<UpdateResponse> {
  const { id, task_updates, new_tasks, add_note, plan_status } = args;

  if (!id || typeof id !== 'string') {
    throw createValidationError('Plan id is required and must be a non-empty string');
  }

  if (task_updates !== undefined && !Array.isArray(task_updates)) {
    throw createValidationError('task_updates must be an array if provided');
  }

  if (new_tasks !== undefined && !Array.isArray(new_tasks)) {
    throw createValidationError('new_tasks must be an array if provided');
  }

  if (add_note !== undefined && typeof add_note !== 'string') {
    throw createValidationError('add_note must be a string if provided');
  }

  if (plan_status !== undefined) {
    if (!['planning', 'in_progress', 'completed', 'on_hold', 'abandoned'].includes(plan_status)) {
      throw createValidationError('plan_status must be one of: planning, in_progress, completed, on_hold, abandoned');
    }
  }

  if (task_updates) {
    for (let i = 0; i < task_updates.length; i++) {
      const update = task_updates[i];

      if (!update || typeof update !== 'object') {
        throw createValidationError(`task_update at index ${i} must be an object`);
      }

      if (typeof update.index !== 'number' || update.index < 0) {
        throw createValidationError(`task_update at index ${i} must have a valid index (non-negative number)`);
      }

      if (!['pending', 'in_progress', 'completed'].includes(update.status)) {
        throw createValidationError(`task_update at index ${i} status must be one of: pending, in_progress, completed`);
      }
    }
  }

  if (new_tasks) {
    for (let i = 0; i < new_tasks.length; i++) {
      const task = new_tasks[i];

      if (!task || typeof task !== 'object') {
        throw createValidationError(`new_task at index ${i} must be an object`);
      }

      if (!task.summary || typeof task.summary !== 'string') {
        throw createValidationError(`new_task at index ${i} must have a non-empty summary`);
      }

      if (task.details !== undefined && typeof task.details !== 'string') {
        throw createValidationError(`new_task at index ${i} details must be a string if provided`);
      }

      if (task.status !== undefined && !['pending', 'in_progress', 'completed'].includes(task.status)) {
        throw createValidationError(`new_task at index ${i} status must be one of: pending, in_progress, completed`);
      }
    }
  }

  return await withLock(EMBEDDINGS_FILE, async () => {
    const plan = readPlan(id);

    if (!plan) {
      throw createNotFoundError(`Plan with id "${id}" not found`);
    }

      const contentChanged = false;

      if (task_updates) {
        for (const update of task_updates) {
          if (update.index >= plan.tasks.length) {
            throw createValidationError(`Task index ${update.index} is out of bounds. Plan has ${plan.tasks.length} tasks.`);
          }

          plan.tasks[update.index].status = update.status;
        }
      }

      if (new_tasks) {
        for (const task of new_tasks) {
          plan.tasks.push({
            summary: task.summary,
            details: task.details,
            status: task.status ?? 'pending'
          });
        }
      }

      if (add_note) {
        const timestamp = formatTimestamp();
        const noteEntry = `${timestamp}: ${add_note}`;

        if (plan.notes) {
          plan.notes += `\n${noteEntry}`;
        } else {
          plan.notes = noteEntry;
        }
      }

      if (plan_status) {
        plan.status = plan_status;
      }

      plan.updated_at = Date.now();

      if (contentChanged) {
        try {
          const embedding = await generatePlanEmbedding(plan);

          if (embedding) {
            const embeddings = readEmbeddings();
            embeddings[id] = embedding;
            saveEmbeddings(embeddings);
          }
        } catch (_error) {
          // Embedding regeneration failure is non-critical
        }
      }

      savePlan(plan);

    return {
      success: true
    };
  });
}
