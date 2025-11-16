import { getReview } from '../../../kanban/services/review-storage.js';
import { ErrorCodes, type KanbanError } from '../../../kanban/types.js';
import { createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Get a specific review
 * Usage: get-review --story <storyId> --round <number> --author <string>
 */
export async function getReviewCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 0, 'get-review --story <storyId> --round <number> --author <string>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'get-review --story <storyId> --round <number> --author <string>' });
    }

    const storyId = typeof options.story === 'string' ? options.story : undefined;
    const roundStr = typeof options.round === 'string' ? options.round : undefined;
    const author = typeof options.author === 'string' ? options.author : undefined;

    if (!storyId || storyId.length === 0) {
      throw createInvalidInputError('Missing required option: --story', {
        usage: 'get-review --story <storyId> --round <number> --author <string>'
      });
    }

    if (!roundStr || roundStr.length === 0) {
      throw createInvalidInputError('Missing required option: --round', {
        usage: 'get-review --story <storyId> --round <number> --author <string>'
      });
    }

    if (!author || author.length === 0) {
      throw createInvalidInputError('Missing required option: --author', {
        usage: 'get-review --story <storyId> --round <number> --author <string>'
      });
    }

    const round = parseInt(roundStr, 10);
    if (isNaN(round) || round < 1) {
      throw createInvalidInputError(`Invalid round number: ${roundStr}. Must be a positive integer.`, {
        usage: 'get-review --story <storyId> --round <number> --author <string>'
      });
    }

    const review = await getReview(storyId, round, author);

    if (!review) {
      return buildSuccess('get-review', {
        error: 'Review not found',
        storyId,
        round,
        reviewer: author
      });
    }

    return buildSuccess('get-review', review);

  } catch (error) {
    const err = error as KanbanError;
    const additionalData = err.details ?? {};
    return buildError('get-review', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR, additionalData);
  }
}
