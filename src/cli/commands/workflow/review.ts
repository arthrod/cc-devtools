/**
 * Workflow review command - execute automated code review
 */

import {
  executeAutomatedReview,
  cleanupReviewMetadata,
} from '../../../workflow/index.js';
import { getOption } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { ErrorWithCode } from '../../../shared/types/common.js';

/**
 * Execute workflow review command
 */
export async function reviewCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<unknown> {
  try {
    const cleanup = getOption<boolean>(options, 'cleanup', false);

    // If cleanup flag is set, just cleanup metadata and exit
    if (cleanup) {
      try {
        const deletedCount = cleanupReviewMetadata();
        return buildSuccess('workflow review', {
          message: 'Review metadata cleaned up successfully',
          filesDeleted: deletedCount,
        });
      } catch (error) {
        const err = error as ErrorWithCode;
        return buildError(
          'workflow review',
          err.message ?? 'Failed to cleanup review metadata',
          err.code ?? 'CLEANUP_ERROR'
        );
      }
    }

    // Determine which reviewers to run
    const reviewerNames = positional.length > 0 ? positional : undefined;

    // Execute automated review (passes reviewer names, not full configs)
    const result = await executeAutomatedReview(reviewerNames, undefined, (message) => {
      console.error(message);
    });

    // Build response
    const responseData = {
      message: `Automated review completed`,
      successful: result.successful,
      failed: result.failed,
      timedOut: result.timedOut,
      results: result.results,
    };

    return buildSuccess('workflow review', responseData);
  } catch (error) {
    const err = error as ErrorWithCode;
    return buildError(
      'workflow review',
      err.message ?? 'Failed to execute automated review',
      err.code ?? 'REVIEW_ERROR'
    );
  }
}
