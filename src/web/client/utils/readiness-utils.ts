import type { Story, Subtask } from '../../../kanban/types.js';

/**
 * Utilities for detecting kanban item readiness for moving to ready columns.
 * Simplified version for new architecture - just checks basic completion criteria.
 */

/**
 * Determines if a field value represents an incomplete state for readiness validation.
 */
function isFieldIncomplete(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Determines if a story meets basic criteria to be moved to the ready status.
 * In the new schema, we check for required fields like title, description, and business_value.
 */
export function isStoryReadyForReady(story: Story): boolean {
  // Skip stories already in progress or done
  if (story.status === 'in_progress' || story.status === 'in_review' || story.status === 'done') {
    return false;
  }

  // Check essential fields
  if (isFieldIncomplete(story.title)) return false;
  if (isFieldIncomplete(story.description)) return false;
  if (isFieldIncomplete(story.business_value)) return false;

  return true;
}

/**
 * Determines if a subtask meets basic criteria to be moved to the ready status.
 */
export function isSubtaskReadyForReady(subtask: Subtask): boolean {
  // Skip subtasks already in progress or done
  if (subtask.status === 'in_progress' || subtask.status === 'done') {
    return false;
  }

  // Check essential fields
  if (isFieldIncomplete(subtask.title)) return false;
  if (isFieldIncomplete(subtask.description)) return false;

  return true;
}

/**
 * Identifies which required fields are missing or incomplete for a story.
 */
export function getStoryMissingFields(story: Story): string[] {
  const missing: string[] = [];
  const requiredFields: Array<keyof Story> = ['title', 'description', 'business_value'];

  for (const field of requiredFields) {
    const value = story[field];
    if (isFieldIncomplete(value)) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * Identifies which required fields are missing or incomplete for a subtask.
 */
export function getSubtaskMissingFields(subtask: Subtask): string[] {
  const missing: string[] = [];
  const requiredFields: Array<keyof Subtask> = ['title', 'description'];

  for (const field of requiredFields) {
    const value = subtask[field];
    if (isFieldIncomplete(value)) {
      missing.push(field);
    }
  }

  return missing;
}
