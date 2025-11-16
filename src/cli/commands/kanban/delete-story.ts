import { deleteStory, parseId } from '../../../kanban/services/storage.js';
import { ErrorCodes, type KanbanError } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Delete a story and all its subtasks
 */
export async function deleteStoryCommand(
  positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 1, 'delete-story <storyId>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'delete-story <storyId>' });
    }

    const storyId = positional[0];
    const parsed = parseId(storyId);

    if (parsed.type !== 'story') {
      throw createInvalidInputError(
        `${storyId} is a subtask ID. Use 'delete-subtask' to delete subtasks.`,
        { usage: 'delete-story <storyId>' }
      );
    }

    const deletedStory = await deleteStory(storyId);

    if (!deletedStory) {
      throw createNotFoundError(`Story ${storyId} not found`);
    }

    const subtaskCount = deletedStory.subtasks?.length ?? 0;

    return buildSuccess('delete-story', {
      deleted: {
        id: deletedStory.id,
        title: deletedStory.title,
        status: deletedStory.status,
        subtaskCount
      },
      message: `Story ${storyId} and ${subtaskCount} subtask(s) deleted successfully`
    });

  } catch (error) {
    const err = error as KanbanError;
    return buildError('delete-story', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
