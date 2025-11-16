import { readAllStories, readStory, readConfig, parseId } from '../../../kanban/services/storage.js';
import { validateStoryMove, validateSubtaskMove } from '../../../kanban/services/validation.js';
import { ErrorCodes, type StoryStatus, type SubtaskStatus, type KanbanError } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Validate a status move without executing
 */
export async function validateCommand(
  positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    // Validate arguments
    const validation = validatePositionalArgs(positional, 2, 'validate <ID> <newStatus>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'validate <ID> <newStatus>' });
    }

    const id = positional[0];
    const newStatus = positional[1];

    const parsed = parseId(id);
    const story = await readStory(parsed.storyId);

    if (!story) {
      throw createNotFoundError(`Story ${parsed.storyId} not found`);
    }

    // Read config once to avoid nested locking
    const [allStories, config] = await Promise.all([readAllStories(), readConfig()]);

    let validationResult;
    let currentStatus: string;

    if (parsed.type === 'story') {
      validationResult = await validateStoryMove(story.id, newStatus as StoryStatus, allStories, config);
      currentStatus = story.status;
    } else {
      const subtask = story.subtasks?.find(st => st.id === id);
      if (!subtask) {
        throw createNotFoundError(`Subtask ${id} not found`);
      }

      validationResult = await validateSubtaskMove(id, newStatus as SubtaskStatus, allStories, config);
      currentStatus = subtask.status;
    }

    // Build checks array
    const checks: Array<{ rule: string; passed: boolean; reason: string }> = [];
    if (parsed.type === 'story') {
      checks.push({
        rule: 'max_in_progress',
        passed: !validationResult.blockingStories || validationResult.blockingStories.length === 0,
        reason: validationResult.blockingStories && validationResult.blockingStories.length > 0
          ? `Story ${validationResult.blockingStories[0].id} is already in progress`
          : 'No stories in progress'
      });

      if (newStatus === 'in_review' || newStatus === 'done') {
        checks.push({
          rule: 'subtasks_complete',
          passed: !validationResult.incompleteSubtasks || validationResult.incompleteSubtasks.length === 0,
          reason: validationResult.incompleteSubtasks && validationResult.incompleteSubtasks.length > 0
            ? `${validationResult.incompleteSubtasks.length} subtasks incomplete`
            : 'All subtasks complete'
        });
      }
    } else {
      checks.push({
        rule: 'parent_in_progress',
        passed: validationResult.valid || story.status === 'in_progress',
        reason: story.status === 'in_progress'
          ? 'Parent story is in progress'
          : `Parent story is in status: ${story.status}`
      });
    }

    if (validationResult.valid) {
      return buildSuccess('validate', {
        valid: true,
        id,
        type: parsed.type,
        currentStatus,
        newStatus,
        checks
      });
    } else {
      return buildSuccess('validate', {
        valid: false,
        id,
        type: parsed.type,
        currentStatus,
        newStatus,
        error: validationResult.error,
        blockingStories: validationResult.blockingStories ?? [],
        incompleteSubtasks: validationResult.incompleteSubtasks ?? [],
        checks
      });
    }

  } catch (error) {
    const err = error as KanbanError;
    return buildError('validate', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
