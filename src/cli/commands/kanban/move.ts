import { readAllStories, readStory, readConfig, parseId, saveStory } from '../../../kanban/services/storage.js';
import { validateStoryMove, validateSubtaskMove, checkSubtasksComplete } from '../../../kanban/services/validation.js';
import { ErrorCodes, type StoryStatus, type SubtaskStatus, type KanbanError } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError, createValidationError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Move story or subtask to new status
 */
export async function moveCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    // Validate arguments
    const validation = validatePositionalArgs(positional, 2, 'move <ID> <newStatus> [--note="..."]');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'move <ID> <newStatus> [--note="..."]' });
    }

    const id = positional[0];
    const newStatus = positional[1];
    const note = typeof options.note === 'string' ? options.note : null;

    const parsed = parseId(id);
    const story = await readStory(parsed.storyId);

    if (!story) {
      throw createNotFoundError(`Story ${parsed.storyId} not found`);
    }

    const timestamp = new Date().toISOString();
    let oldStatus: string;

    if (parsed.type === 'story') {
      // Validate story move
      const [allStories, config] = await Promise.all([readAllStories(), readConfig()]);
      const validationResult = await validateStoryMove(story.id, newStatus as StoryStatus, allStories, config);

      if (!validationResult.valid) {
        throw createValidationError(validationResult.error ?? '', {
          rule: validationResult.blockingStories ? 'max_in_progress' : 'subtasks_complete',
          blockingStories: validationResult.blockingStories ?? [],
          incompleteSubtasks: validationResult.incompleteSubtasks ?? []
        });
      }

      // Execute move
      oldStatus = story.status;
      story.status = newStatus as StoryStatus;
      story.updated_at = timestamp;

      // Set completion timestamp
      if (newStatus === 'done') {
        story.completion_timestamp = timestamp;
      } else if (oldStatus === 'done') {
        story.completion_timestamp = undefined;
      }

      // Add note if provided
      if (note) {
        const noteText = `\n[${newStatus.toUpperCase()} on ${timestamp.split('T')[0]}]: ${note}`;
        story.implementation_notes = (story.implementation_notes ?? '') + noteText;
      }

      await saveStory(story);

      const allSubtasksComplete = checkSubtasksComplete(story).complete;

      return buildSuccess('move', {
        id: story.id,
        type: 'story',
        oldStatus,
        newStatus,
        updated: { story },
        timestamp,
        allSubtasksComplete,
        nextSuggestion: allSubtasksComplete && newStatus === 'in_progress'
          ? 'Move to review'
          : newStatus === 'in_progress'
          ? 'Work on subtasks'
          : newStatus === 'done'
          ? 'Start next story'
          : null
      });

    } else {
      // Validate subtask move
      const subtask = story.subtasks?.find(st => st.id === id);

      if (!subtask) {
        throw createNotFoundError(`Subtask ${id} not found`);
      }

      const [allStories, config] = await Promise.all([readAllStories(), readConfig()]);
      const validationResult = await validateSubtaskMove(id, newStatus as SubtaskStatus, allStories, config);

      if (!validationResult.valid) {
        throw createValidationError(validationResult.error ?? '', {
          rule: 'parent_in_progress',
          parentStatus: story.status
        });
      }

      // Execute move
      oldStatus = subtask.status;
      subtask.status = newStatus as SubtaskStatus;
      subtask.updated_at = timestamp;

      // Set completion timestamp
      if (newStatus === 'done') {
        subtask.completion_timestamp = timestamp;
      } else if (oldStatus === 'done') {
        subtask.completion_timestamp = undefined;
      }

      // Add note if provided
      if (note) {
        const noteText = `\n[${newStatus.toUpperCase()} on ${timestamp.split('T')[0]}]: ${note}`;
        subtask.implementation_notes = (subtask.implementation_notes ?? '') + noteText;
      }

      // Update parent story timestamp
      story.updated_at = timestamp;

      await saveStory(story);

      const allSubtasksComplete = checkSubtasksComplete(story).complete;

      return buildSuccess('move', {
        id: subtask.id,
        type: 'subtask',
        oldStatus,
        newStatus,
        updated: { subtask, story },
        timestamp,
        allSubtasksComplete,
        nextSuggestion: allSubtasksComplete
          ? `Move story ${story.id} to review`
          : 'Continue with next subtask'
      });
    }

  } catch (error) {
    const err = error as KanbanError;
    const additionalData = err.details ?? {};
    return buildError('move', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR, additionalData);
  }
}
