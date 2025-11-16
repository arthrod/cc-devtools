/**
 * Search stories and subtasks using hybrid keyword + semantic search
 */

import { searchKanban } from '../../../kanban/services/search.js';
import { readAllStories } from '../../../kanban/services/storage.js';
import { getOption } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { StoryStatus, SubtaskStatus } from '../../../kanban/types.js';
import type { ErrorWithCode } from '../../../shared/types/common.js';

/**
 * Search command handler
 */
export async function searchCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<unknown> {
  try {
    // Query is first positional argument
    const query = positional[0];

    if (!query) {
      return buildError(
        'search',
        'Missing required argument: query\n\nUsage: npx cc-devtools kanban search <query> [options]',
        'INVALID_INPUT'
      );
    }

    // Parse options
    const limit = parseInt(getOption(options, 'limit', '5'), 10);
    const similarityThreshold = parseFloat(getOption(options, 'similarity-threshold', '0.3'));
    const scopeRaw = getOption(options, 'scope', 'stories');
    const status = getOption(options, 'status', undefined) as StoryStatus | SubtaskStatus | undefined;
    const storyId = getOption(options, 'story', undefined);

    // Validate scope
    if (scopeRaw !== 'stories' && scopeRaw !== 'subtasks' && scopeRaw !== 'both') {
      return buildError(
        'search',
        `Invalid scope: "${String(scopeRaw)}". Must be one of: stories, subtasks, both`,
        'INVALID_INPUT'
      );
    }

    const scope = scopeRaw as 'stories' | 'subtasks' | 'both';

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      return buildError(
        'search',
        `Invalid limit: "${getOption(options, 'limit', '5')}". Must be a positive integer.`,
        'INVALID_INPUT'
      );
    }

    // Validate similarity threshold
    if (isNaN(similarityThreshold) || similarityThreshold < 0 || similarityThreshold > 1) {
      return buildError(
        'search',
        `Invalid similarity-threshold: "${getOption(options, 'similarity-threshold', '0.3')}". Must be between 0 and 1.`,
        'INVALID_INPUT'
      );
    }

    // Validate story filter is only used with subtask scope
    if (storyId && scope === 'stories') {
      return buildError(
        'search',
        'The --story filter can only be used with --scope=subtasks or --scope=both',
        'INVALID_INPUT'
      );
    }

    // Read all stories
    const stories = await readAllStories();

    // Perform search
    const results = await searchKanban(stories, {
      query,
      limit,
      similarityThreshold,
      scope,
      status,
      storyId
    });

    return buildSuccess('search', { results });

  } catch (error) {
    const err = error as ErrorWithCode;
    return buildError(
      'search',
      err.message ?? 'Search failed',
      err.code ?? 'UNKNOWN_ERROR'
    );
  }
}
