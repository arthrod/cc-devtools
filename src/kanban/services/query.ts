import type {
  Story,
  FilterCriteria,
  CurrentWork,
  RankedStory,
  StoriesByStatus,
  StoriesByPhase,
  BusinessValue,
  Phase
} from '../types.js';

import { checkDependenciesMet } from './validation.js';

/**
 * Filter stories by criteria
 * @param stories - Array of stories
 * @param criteria - Filter criteria
 * @returns Filtered stories
 */
export function filterStories(stories: Story[], criteria: FilterCriteria): Story[] {
  let filtered = [...stories];

  if (criteria.status) {
    filtered = filtered.filter(s => s.status === criteria.status);
  }

  if (criteria.phase) {
    filtered = filtered.filter(s => s.phase === criteria.phase);
  }

  if (criteria.label !== undefined) {
    filtered = filtered.filter(s => s.labels?.includes(criteria.label!));
  }

  if (criteria.value) {
    filtered = filtered.filter(s => s.business_value === criteria.value);
  }

  if (criteria.hasSubtasks !== undefined) {
    filtered = filtered.filter(s => {
      const has = s.subtasks && s.subtasks.length > 0;
      return criteria.hasSubtasks ? has : !has;
    });
  }

  if (criteria.ready) {
    filtered = filtered.filter(s => {
      const deps = checkDependenciesMet(s.id, stories);
      return deps.met;
    });
  }

  return filtered;
}

/**
 * Find current work in progress
 * @param stories - Array of stories
 * @returns Current work or null
 */
export function findCurrentWork(stories: Story[]): CurrentWork | null {
  const inProgressStory = stories.find(s => s.status === 'in_progress');

  if (!inProgressStory) {
    return null;
  }

  // Check for in-progress subtask
  if (inProgressStory.subtasks && inProgressStory.subtasks.length > 0) {
    const inProgressSubtask = inProgressStory.subtasks.find(st => st.status === 'in_progress');
    if (inProgressSubtask) {
      return { story: inProgressStory, subtask: inProgressSubtask };
    }
  }

  return { story: inProgressStory };
}

/**
 * Find next recommended story from todo
 * @param stories - Array of stories
 * @param phases - Ordered array of phases (for priority)
 * @returns Ranked stories with scores
 */
export function findNextRecommendation(stories: Story[], phases: Phase[]): RankedStory[] {
  const todoStories = filterStories(stories, { status: 'todo' });

  // Filter out stories with unmet dependencies
  const ready = todoStories.filter(s => {
    const deps = checkDependenciesMet(s.id, stories);
    return deps.met;
  });

  // Parse story ID to get numeric order (e.g., "MVP-002" -> {phase: "MVP", num: 2})
  // @inline-type-allowed - local helper function
  const parseStoryId = (id: string): { phase: string; num: number } => {
    const match = id.match(/^([A-Z0-9]+)-(\d+)$/);
    if (!match) return { phase: '', num: 999999 };
    return { phase: match[1], num: parseInt(match[2], 10) };
  };

  // Sort by story ID (phase priority from config first, then number ascending)
  const sorted = ready.sort((a, b) => {
    const aId = parseStoryId(a.id);
    const bId = parseStoryId(b.id);

    // Compare phase first using config order
    if (aId.phase !== bId.phase) {
      const aIndex = phases.indexOf(aId.phase);
      const bIndex = phases.indexOf(bId.phase);

      // If phase not in config, sort to end
      const aPriority = aIndex === -1 ? 999999 : aIndex;
      const bPriority = bIndex === -1 ? 999999 : bIndex;

      return aPriority - bPriority;
    }

    // Then compare number (ascending - lower IDs first)
    return aId.num - bId.num;
  });

  // Add metadata for context
  const scored: RankedStory[] = sorted.map(story => {
    const value = story.business_value ?? ('not set' as BusinessValue);
    const effort = story.effort_estimation_hours ?? 0;

    return {
      story,
      score: 0, // Not used for sorting, but kept for compatibility
      effort,
      reasons: [
        `Story ID: ${story.id} (prioritized by creation order)`,
        `Business value: ${value}`,
        `Effort: ${effort} hours`,
        'No blocking dependencies'
      ]
    };
  });

  return scored;
}

/**
 * Group stories by status
 * @param stories - Array of stories
 * @returns Stories grouped by status
 */
export function groupByStatus(stories: Story[]): StoriesByStatus {
  const groups: StoriesByStatus = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: []
  };

  for (const story of stories) {
    if (groups[story.status]) {
      groups[story.status].push(story);
    }
  }

  return groups;
}

/**
 * Group stories by phase
 * @param stories - Array of stories
 * @returns Stories grouped by phase
 */
export function groupByPhase(stories: Story[]): StoriesByPhase {
  const groups: StoriesByPhase = {};

  for (const story of stories) {
    if (!groups[story.phase]) {
      groups[story.phase] = [];
    }
    groups[story.phase].push(story);
  }

  return groups;
}

/**
 * Sort stories by priority (value desc, effort asc)
 * @param stories - Array of stories
 * @returns Sorted stories
 */
export function sortByPriority(stories: Story[]): Story[] {
  const valueMap: Record<string, number> = {
    XS: 1,
    S: 2,
    M: 3,
    L: 5,
    XL: 8
  };

  return [...stories].sort((a, b) => {
    const aValue = valueMap[a.business_value ?? ''] ?? 0;
    const bValue = valueMap[b.business_value ?? ''] ?? 0;

    if (bValue !== aValue) return bValue - aValue;

    const aEffort = a.effort_estimation_hours ?? 0;
    const bEffort = b.effort_estimation_hours ?? 0;

    return aEffort - bEffort;
  });
}
