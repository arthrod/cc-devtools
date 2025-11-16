import {
  formatStoryCard,
  formatStoryOutput,
  formatSubtaskOutput,
  getVerboseField
} from '../../../kanban/services/formatters.js';
import { analyzeProgress, suggestStatusChange } from '../../../kanban/services/recommendation.js';
import { readStory, parseId } from '../../../kanban/services/storage.js';
import { ErrorCodes, type KanbanError, type OutputMode } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Get story or subtask details
 */
export async function getCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 1, 'get <ID> [--full] [--field=<name>]');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'get <ID> [--full] [--field=<name>]' });
    }

    const id = positional[0];
    const parsed = parseId(id);
    const story = await readStory(parsed.storyId);

    if (!story) {
      throw createNotFoundError(`Story ${parsed.storyId} not found`);
    }

    // Determine output mode
    const isFullMode = options.full === true;
    const fieldName = typeof options.field === 'string' ? options.field : undefined;

    // Handle --field flag (retrieve specific verbose field only)
    if (fieldName) {
      if (parsed.type === 'story') {
        try {
          const fieldValue = getVerboseField(story, fieldName);
          return buildSuccess('get', {
            type: 'story',
            id: story.id,
            field: fieldName,
            value: fieldValue
          });
        } catch (error) {
          const err = error as Error;
          throw createInvalidInputError(err.message);
        }
      } else {
        const subtask = story.subtasks?.find(st => st.id === id);
        if (!subtask) {
          throw createNotFoundError(`Subtask ${id} not found`);
        }

        try {
          const fieldValue = getVerboseField(subtask, fieldName);
          return buildSuccess('get', {
            type: 'subtask',
            id: subtask.id,
            field: fieldName,
            value: fieldValue
          });
        } catch (error) {
          const err = error as Error;
          throw createInvalidInputError(err.message);
        }
      }
    }

    // Determine output mode for regular output
    const outputMode: OutputMode = isFullMode ? 'full' : 'condensed';

    if (parsed.type === 'story') {
      const progress = analyzeProgress(story);
      const suggestion = suggestStatusChange(story, 'story');
      const formattedSubtasks = (story.subtasks ?? []).map(st =>
        formatSubtaskOutput(st, outputMode)
      );

      const nextActions: string[] = [];
      if (suggestion.suggested) {
        nextActions.push(`Move to ${suggestion.suggested}: ${suggestion.reason}`);
      }
      if (progress.nextSubtask) {
        nextActions.push(`Start next subtask: ${progress.nextSubtask.id}`);
      }
      if (story.status === 'todo' && (story.subtasks?.length ?? 0) === 0) {
        nextActions.push('Add subtasks with /kanban-add-subtasks');
      }

      const result: Record<string, unknown> = {
        type: 'story',
        item: formatStoryOutput(story, outputMode),
        formatted: formatStoryCard(story),
        progress,
        subtasks: formattedSubtasks,
        nextActions
      };

      if (!isFullMode) {
        result.warning = 'Condensed output: Some fields are hidden. Use --full to see all fields including: description, details, planning_notes, implementation_notes, relevant_documentation, completion_timestamp, updated_at';
      }

      return buildSuccess('get', result);
    } else {
      const subtask = story.subtasks?.find(st => st.id === id);

      if (!subtask) {
        throw createNotFoundError(`Subtask ${id} not found`);
      }

      const progress = analyzeProgress(story);
      const suggestion = suggestStatusChange(subtask, 'subtask');

      const nextActions: string[] = [];
      if (suggestion.suggested) {
        nextActions.push(`Move to ${suggestion.suggested}: ${suggestion.reason}`);
      }
      nextActions.push(`View parent story: ${story.id}`);

      const result: Record<string, unknown> = {
        type: 'subtask',
        item: formatSubtaskOutput(subtask, outputMode),
        parent: {
          id: story.id,
          title: story.title,
          status: story.status,
          progress
        },
        nextActions
      };

      if (!isFullMode) {
        result.warning = 'Condensed output: Some fields are hidden. Use --full to see all fields including: details, planning_notes, implementation_notes, relevant_documentation, completion_timestamp, updated_at';
      }

      return buildSuccess('get', result);
    }

  } catch (error) {
    const err = error as KanbanError;
    return buildError('get', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
