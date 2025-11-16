import { addReview } from '../../../kanban/services/review-storage.js';
import { ErrorCodes, type KanbanError } from '../../../kanban/types.js';
import { createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Add a review for a story
 * Usage: add-review --story <storyId> --round <number> --author <string> --content <review-content>
 */
export async function addReviewCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 0, 'add-review --story <storyId> --round <number> --author <string> --content <content>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'add-review --story <storyId> --round <number> --author <string> --content <content>' });
    }

    const storyId = typeof options.story === 'string' ? options.story : undefined;
    const roundStr = typeof options.round === 'string' ? options.round : undefined;
    const author = typeof options.author === 'string' ? options.author : undefined;
    const content = typeof options.content === 'string' ? options.content : undefined;

    if (!storyId || storyId.length === 0) {
      throw createInvalidInputError('Missing required option: --story', {
        usage: 'add-review --story <storyId> --round <number> --author <string> --content <content>'
      });
    }

    if (!roundStr || roundStr.length === 0) {
      throw createInvalidInputError('Missing required option: --round', {
        usage: 'add-review --story <storyId> --round <number> --author <string> --content <content>'
      });
    }

    if (!author || author.length === 0) {
      throw createInvalidInputError('Missing required option: --author', {
        usage: 'add-review --story <storyId> --round <number> --author <string> --content <content>'
      });
    }

    if (!content || content.length === 0) {
      throw createInvalidInputError('Missing required option: --content', {
        usage: 'add-review --story <storyId> --round <number> --author <string> --content <content>'
      });
    }

    const round = parseInt(roundStr, 10);
    if (isNaN(round) || round < 1) {
      throw createInvalidInputError(`Invalid round number: ${roundStr}. Must be a positive integer.`, {
        usage: 'add-review --story <storyId> --round <number> --author <string> --content <content>'
      });
    }

    const review = await addReview(storyId, round, author, content);

    return buildSuccess('add-review', {
      success: true,
      message: 'Review added successfully',
      storyId: review.storyId,
      round: review.round,
      reviewer: review.reviewer
    });

  } catch (error) {
    const err = error as KanbanError;
    const additionalData = err.details ?? {};
    return buildError('add-review', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR, additionalData);
  }
}
