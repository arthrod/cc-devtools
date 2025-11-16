import { getDaysSince } from '../../../kanban/services/formatters.js';
import { groupByStatus, groupByPhase } from '../../../kanban/services/query.js';
import { readAllStories, readConfig } from '../../../kanban/services/storage.js';
import { checkMaxInProgress } from '../../../kanban/services/validation.js';
import { ErrorCodes, type Story, type KanbanError } from '../../../kanban/types.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

// Extended Story type with optional legacy fields
type StoryWithMeta = Story & {
  created_at?: string;
  details?: string;
  acceptance_criteria?: string[];
};

interface StoryDistribution {
  total: number;
  byStatus: Record<string, number>;
  byPhase: Record<string, number>;
  byValue: Record<string, number>;
}

interface EffortMetrics {
  total: number;
  byStatus: Record<string, number>;
  byPhase: Record<string, number>;
  avgByValue: Record<string, number>;
}

/**
 * Get kanban statistics and optional health check
 */
export async function statsCommand(
  _positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const allStories = await readAllStories() as StoryWithMeta[];
    const healthCheck = options['health-check'] || false;

    // Calculate statistics
    const grouped = groupByStatus(allStories);
    const byPhase = groupByPhase(allStories);

    // Distribution
    const distribution: StoryDistribution = {
      total: allStories.length,
      byStatus: {},
      byPhase: {},
      byValue: {}
    };

    for (const [status, statusStories] of Object.entries(grouped) as Array<[string, Story[]]>) {
      if (statusStories.length > 0) {
        distribution.byStatus[status] = statusStories.length;
      }
    }

    for (const [phase, phaseStories] of Object.entries(byPhase)) {
      if (Array.isArray(phaseStories)) {
        distribution.byPhase[phase] = phaseStories.length;
      }
    }

    const valueCounts: Record<string, number> = {};
    for (const story of allStories) {
      const val = story.business_value ?? 'not_set';
      valueCounts[val] = (valueCounts[val] ?? 0) + 1;
    }
    distribution.byValue = valueCounts;

    // Progress metrics
    const completedStories = grouped.done ?? [];
    const completionRate = allStories.length > 0 ? completedStories.length / allStories.length : 0;

    // Velocity (stories completed in last 7 days)
    const recentlyCompleted = completedStories.filter(s => {
      if (!s.completion_timestamp) return false;
      const days = getDaysSince(s.completion_timestamp);
      return days !== null && days <= 7;
    });

    // Average subtasks per story
    const storiesWithSubtasks = allStories.filter(s => s.subtasks && s.subtasks.length > 0);
    const totalSubtasks = storiesWithSubtasks.reduce((sum, s) => sum + (s.subtasks?.length ?? 0), 0);
    const avgSubtasks = storiesWithSubtasks.length > 0 ? totalSubtasks / storiesWithSubtasks.length : 0;

    const progress = {
      completionRate: Math.round(completionRate * 100) / 100,
      velocity: recentlyCompleted.length,
      avgSubtasks: Math.round(avgSubtasks * 10) / 10
    };

    // Effort analysis
    const effort: EffortMetrics = {
      total: 0,
      byStatus: {},
      byPhase: {},
      avgByValue: {}
    };

    const effortByValueTemp: Record<string, { total: number; count: number }> = {};

    for (const story of allStories) {
      const hours = story.effort_estimation_hours ?? 0;
      effort.total += hours;

      effort.byStatus[story.status] = (effort.byStatus[story.status] ?? 0) + hours;
      effort.byPhase[story.phase] = (effort.byPhase[story.phase] ?? 0) + hours;

      const val = story.business_value ?? 'not_set';
      if (!effortByValueTemp[val]) {
        effortByValueTemp[val] = { total: 0, count: 0 };
      }
      effortByValueTemp[val].total += hours;
      effortByValueTemp[val].count++;
    }

    // Calculate averages
    for (const [val, data] of Object.entries(effortByValueTemp)) {
      effort.avgByValue[val] = data.count > 0 ? Math.round(data.total / data.count) : 0;
    }

    // Subtask statistics
    let totalSubtaskCount = 0;
    let completedSubtaskCount = 0;

    for (const story of allStories) {
      if (story.subtasks) {
        totalSubtaskCount += story.subtasks.length;
        completedSubtaskCount += story.subtasks.filter(st => st.status === 'done').length;
      }
    }

    const subtasks = {
      total: totalSubtaskCount,
      completed: completedSubtaskCount,
      completionRate: totalSubtaskCount > 0 ? Math.round((completedSubtaskCount / totalSubtaskCount) * 100) / 100 : 0
    };

    // Labels analysis
    const labelCounts: Record<string, number> = {};
    for (const story of allStories) {
      if (story.labels) {
        for (const label of story.labels) {
          labelCounts[label] = (labelCounts[label] ?? 0) + 1;
        }
      }
    }

    const labels = Object.entries(labelCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Dependencies
    const withDependencies = allStories.filter(s => s.dependent_upon && s.dependent_upon.length > 0).length;

    const blockingOthers = new Set<string>();
    for (const story of allStories) {
      if (story.dependent_upon) {
        for (const depId of story.dependent_upon) {
          blockingOthers.add(depId);
        }
      }
    }

    const readyToStart = allStories.filter(s => {
      if (!s.dependent_upon || s.dependent_upon.length === 0) return true;
      return s.dependent_upon.every(depId => {
        const dep = allStories.find(st => st.id === depId);
        return dep && dep.status === 'done';
      });
    }).length;

    const dependencies = {
      withDependencies,
      blockingOthers: blockingOthers.size,
      readyToStart
    };

    // Time analysis
    const todoStories = grouped.todo ?? [];

    // Note: created_at is not part of the core Story type, so time analysis is limited
    const oldestTodo = null;
    const avgTimeToComplete = null;

    const time = {
      oldestTodo,
      avgTimeToComplete
    };

    const stats = {
      distribution,
      progress,
      effort,
      subtasks,
      labels,
      dependencies,
      time
    };

    // Health check if requested
    let health = null;

    if (healthCheck) {
      // Read config once for all health checks to avoid nested locking
      const config = await readConfig();
      const issues: Array<{
        severity: string;
        type: string;
        story?: { id: string; title: string };
        stories?: Array<{ id: string; title: string }>;
        item?: { id: string; title: string };
        missing?: string[];
        message: string;
        solution: string;
      }> = [];

      // Issue 1: Stories in TODO without subtasks
      const todoWithoutSubtasks = todoStories.filter(s => !s.subtasks || s.subtasks.length === 0);
      for (const story of todoWithoutSubtasks) {
        issues.push({
          severity: 'CRITICAL',
          type: 'TODO_WITHOUT_SUBTASKS',
          story: { id: story.id, title: story.title },
          message: 'Story in TODO without subtasks defined',
          solution: `Run /kanban-add-subtasks ${story.id}`
        });
      }

      // Issue 2: All subtasks complete but story not in review
      const inProgressStories = grouped.in_progress ?? [];
      for (const story of inProgressStories) {
        if (story.subtasks && story.subtasks.length > 0) {
          const allComplete = story.subtasks.every(st => st.status === 'done');
          if (allComplete) {
            issues.push({
              severity: 'CRITICAL',
              type: 'COMPLETED_SUBTASKS_NOT_IN_REVIEW',
              story: { id: story.id, title: story.title },
              message: `All ${story.subtasks.length} subtasks completed but story not in review`,
              solution: `Run /kanban-move ${story.id} in_review`
            });
          }
        }
      }

      // Issue 3: Multiple stories in progress
      const maxCheck = await checkMaxInProgress(allStories, config);
      if (maxCheck.violated) {
        issues.push({
          severity: 'CRITICAL',
          type: 'MULTIPLE_IN_PROGRESS',
          stories: maxCheck.stories.map((s: Story) => ({ id: s.id, title: s.title })),
          message: 'Multiple stories in progress (violates workflow rule)',
          solution: 'Move all but one to todo or blocked'
        });
      }

      // Issue 4: Insufficient detail (only check if fields exist)
      for (const story of allStories) {
        const missing: string[] = [];

        if (!story.description || story.description.trim() === '') {
          missing.push('description');
        }
        if (story.details !== undefined && (!story.details || story.details.trim() === '')) {
          missing.push('details');
        }
        if (story.acceptance_criteria !== undefined && (!story.acceptance_criteria || story.acceptance_criteria.length === 0)) {
          missing.push('acceptance_criteria');
        }
        if ((story.effort_estimation_hours ?? 0) > 8 && (!story.subtasks || story.subtasks.length === 0)) {
          missing.push('needs_subtasks');
        }

        if (missing.length > 0) {
          issues.push({
            severity: 'CRITICAL',
            type: 'INSUFFICIENT_DETAIL',
            item: { id: story.id, title: story.title },
            missing,
            message: `Story lacks ${missing.join(', ')}`,
            solution: missing.includes('needs_subtasks')
              ? `Run /kanban-add-subtasks ${story.id}`
              : 'Add details or regenerate story'
          });
        }
      }

      health = {
        healthy: issues.length === 0,
        issues,
        summary: {
          critical: issues.filter(i => i.severity === 'CRITICAL').length,
          warning: issues.filter(i => i.severity === 'WARNING').length
        }
      };
    }

    // @inline-type-allowed - using typeof for type inference
    const output: { stats: typeof stats; health?: typeof health } = { stats };
    if (health) {
      output.health = health;
    }

    return buildSuccess('stats', output);

  } catch (error) {
    const err = error as KanbanError;
    return buildError('stats', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
