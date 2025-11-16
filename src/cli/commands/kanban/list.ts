import { formatStoryCard } from '../../../kanban/services/formatters.js';
import { filterStories, findCurrentWork, groupByStatus, groupByPhase } from '../../../kanban/services/query.js';
import { analyzeProgress } from '../../../kanban/services/recommendation.js';
import { readAllStories } from '../../../kanban/services/storage.js';
import { ErrorCodes, type Story, type KanbanError } from '../../../kanban/types.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * List stories with optional filtering
 */
export async function listCommand(
  _positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const allStories = await readAllStories();

    if (options.filter === 'current') {
      const current = findCurrentWork(allStories);

      if (!current) {
        return buildSuccess('list', {
          current: null,
          message: 'No story currently in progress'
        });
      }

      const progress = analyzeProgress(current.story);
      const formatted = formatStoryCard(current.story);

      return buildSuccess('list', {
        current: {
          story: current.story,
          subtask: current.subtask ?? null,
          formatted,
          progress
        }
      });
    }

    const criteria: Record<string, string> = {};
    if (options.filter && options.filter !== 'all') {
      criteria.status = options.filter as string;
    }
    if (options.phase) {
      criteria.phase = options.phase as string;
    }
    if (options.label) {
      criteria.label = options.label as string;
    }
    if (options.value) {
      criteria.value = options.value as string;
    }

    const filtered = Object.keys(criteria).length > 0
      ? filterStories(allStories, criteria)
      : allStories;

    const grouped = groupByStatus(filtered);
    const byPhase = groupByPhase(filtered);

    const summary = {
      total: filtered.length,
      byStatus: {} as Record<string, number>,
      byPhase: {} as Record<string, number>,
      byValue: {} as Record<string, number>
    };

    for (const [status, storyList] of Object.entries(grouped) as Array<[string, Story[]]>) {
      if (storyList.length > 0) {
        summary.byStatus[status] = storyList.length;
      }
    }

    for (const [phase, phaseStories] of Object.entries(byPhase)) {
      if (Array.isArray(phaseStories)) {
        summary.byPhase[phase] = phaseStories.length;
      }
    }

    const valueCounts: Record<string, number> = {};
    for (const story of filtered) {
      const val = story.business_value ?? 'not_set';
      valueCounts[val] = (valueCounts[val] ?? 0) + 1;
    }
    summary.byValue = valueCounts;

    const formattedStories = filtered.map(formatStoryCard);

    return buildSuccess('list', {
      stories: filtered,
      formatted: formattedStories,
      grouped,
      summary
    });

  } catch (error) {
    const err = error as KanbanError;
    return buildError('list', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
