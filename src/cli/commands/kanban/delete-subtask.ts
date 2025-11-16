import { readStory, saveStory, parseId } from '../../../kanban/services/storage.js';
import { ErrorCodes, type KanbanError } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Delete a specific subtask from a story
 */
export async function deleteSubtaskCommand(
  positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 1, 'delete-subtask <subtaskId>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'delete-subtask <subtaskId>' });
    }

    const subtaskId = positional[0];
    const parsed = parseId(subtaskId);

    if (parsed.type !== 'subtask') {
      throw createInvalidInputError(
        `${subtaskId} is a story ID. Use 'delete-story' to delete stories.`,
        { usage: 'delete-subtask <subtaskId>' }
      );
    }

    const story = await readStory(parsed.storyId);

    if (!story) {
      throw createNotFoundError(`Story ${parsed.storyId} not found`);
    }

    const subtaskIndex = story.subtasks?.findIndex(st => st.id === subtaskId);

    if (subtaskIndex === undefined || subtaskIndex === -1) {
      throw createNotFoundError(`Subtask ${subtaskId} not found`);
    }

    const deletedSubtask = story.subtasks![subtaskIndex];

    story.subtasks!.splice(subtaskIndex, 1);
    story.updated_at = new Date().toISOString();

    await saveStory(story);

    return buildSuccess('delete-subtask', {
      deleted: {
        id: deletedSubtask.id,
        title: deletedSubtask.title,
        status: deletedSubtask.status,
        parentStoryId: parsed.storyId
      },
      story: {
        id: story.id,
        title: story.title,
        remainingSubtasks: story.subtasks?.length ?? 0
      },
      message: `Subtask ${subtaskId} deleted successfully`
    });

  } catch (error) {
    const err = error as KanbanError;
    return buildError('delete-subtask', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
