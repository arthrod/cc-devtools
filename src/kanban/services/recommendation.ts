import type {
  Story,
  Subtask,
  WorkRecommendation,
  RankedStory,
  ProgressAnalysis,
  StatusChangeSuggestion,
  Phase
} from '../types.js';

import { findCurrentWork, findNextRecommendation } from './query.js';
import { checkSubtasksComplete } from './validation.js';

/**
 * Get next work item (current or recommended)
 * @param stories - Array of stories
 * @param phases - Ordered array of phases (for priority)
 * @returns Work recommendation or null
 */
export function getNextWorkItem(stories: Story[], phases: Phase[]): WorkRecommendation | null {
  const current = findCurrentWork(stories);

  if (current) {
    if (current.subtask) {
      return {
        type: 'subtask',
        story: current.story,
        item: current.subtask,
        subtask: current.subtask,
        reason: 'Currently in progress'
      };
    }

    // Story in progress without subtasks
    if (!current.story.subtasks || current.story.subtasks.length === 0) {
      return {
        type: 'story',
        story: current.story,
        item: current.story,
        reason: 'Currently in progress (no subtasks)'
      };
    }

    // Story has subtasks - find next one to work on
    const nextSubtask = findNextSubtask(current.story);
    if (nextSubtask) {
      return {
        type: 'subtask',
        story: current.story,
        item: nextSubtask,
        subtask: nextSubtask,
        reason: 'Next todo subtask (parent in progress)'
      };
    }

    // All subtasks complete or blocked
    const progress = checkSubtasksComplete(current.story);
    if (progress.complete) {
      return {
        type: 'story',
        story: current.story,
        item: current.story,
        reason: 'All subtasks complete - ready for review',
        suggestion: 'Move to review'
      };
    }

    return {
      type: 'story',
      story: current.story,
      item: current.story,
      reason: 'All remaining subtasks are blocked'
    };
  }

  // No current work - recommend next
  const recommended = findNextRecommendation(stories, phases);
  if (recommended.length > 0) {
    return {
      type: 'story',
      story: recommended[0].story,
      item: recommended[0].story,
      reason: 'Recommended next story',
      score: recommended[0].score,
      reasons: recommended[0].reasons
    };
  }

  return null;
}

/**
 * Rank todo stories by priority
 * @param stories - Array of stories
 * @param phases - Ordered array of phases (for priority)
 * @returns Ranked stories with scores and reasons
 */
export function rankTodoStories(stories: Story[], phases: Phase[]): RankedStory[] {
  return findNextRecommendation(stories, phases);
}

/**
 * Find next subtask to work on
 * @param story - Story object
 * @returns Next subtask or null
 */
export function findNextSubtask(story: Story): Subtask | null {
  if (!story.subtasks || story.subtasks.length === 0) {
    return null;
  }

  // Find first todo subtask with no dependencies or completed dependencies
  const todoSubtasks = story.subtasks.filter(st => st.status === 'todo');

  for (const subtask of todoSubtasks) {
    if (!subtask.dependent_upon || subtask.dependent_upon.length === 0) {
      return subtask;
    }

    // Check if all dependencies are completed
    const allDepsMet = subtask.dependent_upon.every(depId => {
      const depSubtask = story.subtasks!.find(st => st.id === depId);
      return depSubtask && depSubtask.status === 'done';
    });

    if (allDepsMet) {
      return subtask;
    }
  }

  return null;
}

/**
 * Analyze progress of a story
 * @param story - Story object
 * @returns Progress analysis
 */
export function analyzeProgress(story: Story): ProgressAnalysis {
  if (!story.subtasks || story.subtasks.length === 0) {
    return {
      hasSubtasks: false,
      complete: 0,
      total: 0,
      percentage: 0,
      nextSubtask: null
    };
  }

  const completed = story.subtasks.filter(st => st.status === 'done').length;
  const total = story.subtasks.length;
  const percentage = Math.round((completed / total) * 100);
  const nextSubtask = findNextSubtask(story);

  return {
    hasSubtasks: true,
    complete: completed,
    total,
    percentage,
    nextSubtask
  };
}

/**
 * Suggest next status for an item
 * @param item - Story or subtask object
 * @param type - 'story' or 'subtask'
 * @returns Status change suggestion
 */
export function suggestStatusChange(item: Story | Subtask, type: 'story' | 'subtask'): StatusChangeSuggestion {
  if (type === 'subtask') {
    const subtask = item as Subtask;
    if (subtask.status === 'todo') {
      return { suggested: 'in_progress', reason: 'Start work on this subtask' };
    }
    if (subtask.status === 'in_progress') {
      return { suggested: 'done', reason: 'Complete this subtask' };
    }
    if (subtask.status === 'done') {
      return { suggested: null, reason: 'Subtask already done' };
    }
  }

  if (type === 'story') {
    const story = item as Story;
    if (story.status === 'todo') {
      return { suggested: 'in_progress', reason: 'Start work on this story' };
    }
    if (story.status === 'in_progress') {
      const progress = analyzeProgress(story);
      if (progress.hasSubtasks && progress.complete === progress.total) {
        return { suggested: 'in_review', reason: 'All subtasks complete' };
      }
      return { suggested: 'in_review', reason: 'Move to in_review when work is complete' };
    }
    if (story.status === 'in_review') {
      return { suggested: 'done', reason: 'Complete after review' };
    }
    if (story.status === 'done') {
      return { suggested: null, reason: 'Story already done' };
    }
  }

  return { suggested: null, reason: 'Unknown status or type' };
}
