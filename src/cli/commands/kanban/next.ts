import { formatStoryCard } from '../../../kanban/services/formatters.js';
import { getNextWorkItem, rankTodoStories , analyzeProgress } from '../../../kanban/services/recommendation.js';
import { readAllStories, readConfig } from '../../../kanban/services/storage.js';
import { ErrorCodes, type Story, type KanbanError } from '../../../kanban/types.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Find next work item (current or recommended)
 */
export async function nextCommand(
  _positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const allStories = await readAllStories();
    const config = await readConfig();
    const next = getNextWorkItem(allStories, config.phases);

    if (!next) {
      return buildSuccess('next', {
        hasCurrentWork: false,
        recommended: null,
        message: 'No work in progress and no todo stories available'
      });
    }

    // Has current work
    if (next.reason === 'Currently in progress' ||
        next.reason === 'Currently in progress (no subtasks)' ||
        next.reason.includes('parent in progress')) {
      const progress = next.story ? analyzeProgress(next.story) : null;

      return buildSuccess('next', {
        hasCurrentWork: true,
        current: {
          type: next.type,
          story: next.story ?? null,
          subtask: next.subtask ?? next.item,
          progress
        },
        suggestion: next.suggestion ?? `Continue working on ${next.item.id}`,
        reason: next.reason
      });
    }

    // All subtasks complete - ready for review
    if (next.reason === 'All subtasks complete - ready for review') {
      const progress = analyzeProgress(next.item as Story);

      return buildSuccess('next', {
        hasCurrentWork: true,
        current: {
          type: 'story',
          story: next.item as Story,
          progress
        },
        suggestion: `Move ${next.item.id} to review`,
        reason: next.reason
      });
    }

    // Recommended next story
    if (next.reason === 'Recommended next story') {
      const ranked = rankTodoStories(allStories, config.phases);
      const alternatives = ranked.slice(1, 4).map(r => ({
        story: formatStoryCard(r.story),
        score: r.score,
        reasons: r.reasons
      }));

      return buildSuccess('next', {
        hasCurrentWork: false,
        recommended: {
          story: next.item as Story,
          formatted: formatStoryCard(next.item as Story),
          score: next.score,
          reasons: next.reasons
        },
        alternatives,
        suggestion: `Start ${next.item.id}`
      });
    }

    // Default response
    return buildSuccess('next', {
      hasCurrentWork: false,
      item: next.item,
      type: next.type,
      reason: next.reason,
      suggestion: `Work on ${next.item.id}`
    });

  } catch (error) {
    const err = error as KanbanError;
    return buildError('next', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
