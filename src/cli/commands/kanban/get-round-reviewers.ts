import { getRoundReviewers } from '../../../kanban/services/review-storage.js';
import { ErrorCodes, type KanbanError } from '../../../kanban/types.js';
import { createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Get reviewers grouped by round for a story
 * Usage: get-round-reviewers --story <storyId>
 */
export async function getRoundReviewersCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 0, 'get-round-reviewers --story <storyId>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'get-round-reviewers --story <storyId>' });
    }

    const storyId = typeof options.story === 'string' ? options.story : undefined;

    if (!storyId || storyId.length === 0) {
      throw createInvalidInputError('Missing required option: --story', {
        usage: 'get-round-reviewers --story <storyId>'
      });
    }

    const result = await getRoundReviewers(storyId);

    return buildSuccess('get-round-reviewers', result);

  } catch (error) {
    const err = error as KanbanError;
    const additionalData = err.details ?? {};
    return buildError('get-round-reviewers', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR, additionalData);
  }
}
