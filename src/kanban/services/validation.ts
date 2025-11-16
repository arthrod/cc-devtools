import type {
  Story,
  Config,
  StoryStatus,
  SubtaskStatus,
  ValidationResult,
  StatusTransitionResult,
  DependenciesResult,
  MaxInProgressResult,
  SubtasksCompleteResult,
  DependencyValidationResult
} from '../types.js';

import { readConfig } from './storage.js';

/**
 * Validate story status move
 * @param storyId - Story ID
 * @param newStatus - Target status
 * @param allStories - All stories
 * @param config - Config object (optional, will read if not provided)
 * @returns Validation result
 */
export async function validateStoryMove(
  storyId: string,
  newStatus: StoryStatus,
  allStories: Story[],
  config: Config | null = null
): Promise<ValidationResult> {
  // If config not provided, read it (for standalone validation calls)
  if (!config) {
    config = await readConfig();
  }

  const story = allStories.find(s => s.id === storyId);

  if (!story) {
    return { valid: false, error: `Story ${storyId} not found` };
  }

  // Validate status is valid
  if (!config.statuses.story.includes(newStatus)) {
    return { valid: false, error: `Invalid status: ${newStatus}` };
  }

  // Check max stories in progress
  if (newStatus === 'in_progress' && config.workflow_rules.max_stories_in_progress === 1) {
    const inProgressStories = allStories.filter(s => s.id !== storyId && s.status === 'in_progress');
    if (inProgressStories.length > 0) {
      return {
        valid: false,
        error: `Story ${inProgressStories[0].id} is already in progress. Only one story can be in progress at a time.`,
        blockingStories: inProgressStories
      };
    }
  }

  // Check subtasks completed before review
  if (newStatus === 'in_review' && config.workflow_rules.all_subtasks_completed_before_review) {
    const result = checkSubtasksComplete(story);
    if (!result.complete) {
      return {
        valid: false,
        error: `Cannot move to in_review. ${result.incomplete.length} subtasks are not done: ${result.incomplete.map(s => s.id).join(', ')}`,
        incompleteSubtasks: result.incomplete
      };
    }
  }

  // Check all subtasks completed before completion
  if (newStatus === 'done') {
    const result = checkSubtasksComplete(story);
    if (!result.complete) {
      return {
        valid: false,
        error: `Cannot complete story. ${result.incomplete.length} subtasks are not done: ${result.incomplete.map(s => s.id).join(', ')}`,
        incompleteSubtasks: result.incomplete
      };
    }
  }

  return { valid: true };
}

/**
 * Validate subtask status move
 * @param storyId - Parent story ID
 * @param subtaskId - Subtask ID
 * @param newStatus - Target status
 * @param story - Parent story object
 * @param config - Config object (optional, will read if not provided)
 * @returns Validation result
 */
export async function validateSubtaskMove(
  subtaskId: string,
  newStatus: SubtaskStatus,
  allStories: Story[],
  config: Config | null = null
): Promise<ValidationResult> {
  // If config not provided, read it (for standalone validation calls)
  if (!config) {
    config = await readConfig();
  }

  // Find the parent story that contains this subtask
  let parentStory: Story | null = null;
  let subtask = null;

  for (const story of allStories) {
    if (story.subtasks) {
      const found = story.subtasks.find(s => s.id === subtaskId);
      if (found) {
        parentStory = story;
        subtask = found;
        break;
      }
    }
  }

  if (!parentStory || !subtask) {
    return { valid: false, error: `Subtask ${subtaskId} not found` };
  }

  // Validate status is valid
  if (!config.statuses.subtask.includes(newStatus)) {
    return { valid: false, error: `Invalid status: ${newStatus}` };
  }

  // Subtasks require parent story in_progress
  if ((newStatus === 'in_progress' || newStatus === 'done') && config.workflow_rules.subtasks_require_story_in_progress) {
    if (parentStory.status !== 'in_progress') {
      return {
        valid: false,
        error: `Cannot move subtask to ${newStatus}. The parent story must be in_progress. Current parent status: ${parentStory.status}`
      };
    }
  }

  // Check subtask dependencies
  if (subtask.dependent_upon && subtask.dependent_upon.length > 0 && parentStory.subtasks) {
    const unmetDeps: string[] = [];
    for (const depId of subtask.dependent_upon) {
      const depSubtask = parentStory.subtasks.find(s => s.id === depId);
      if (!depSubtask || depSubtask.status !== 'done') {
        unmetDeps.push(depId);
      }
    }

    if (unmetDeps.length > 0) {
      return {
        valid: false,
        error: `Cannot move subtask to ${newStatus}. Subtask dependencies not met: ${unmetDeps.join(', ')}`,
        blockingDependencies: unmetDeps
      };
    }
  }

  return { valid: true };
}

/**
 * Check if max stories in progress is violated
 * @param allStories - All stories
 * @param config - Config object (optional, will read if not provided)
 * @returns Max in progress check result
 */
export async function checkMaxInProgress(allStories: Story[], config: Config | null = null): Promise<MaxInProgressResult> {
  const inProgressStories = allStories.filter(s => s.status === 'in_progress');

  // If config not provided, read it (for standalone validation calls)
  if (!config) {
    config = await readConfig();
  }

  const max = config.workflow_rules.max_stories_in_progress;

  return {
    violated: inProgressStories.length > max,
    stories: inProgressStories,
    limit: max
  };
}

/**
 * Check if all subtasks are complete
 * @param story - Story object
 * @returns Subtasks completion check result
 */
export function checkSubtasksComplete(story: Story): SubtasksCompleteResult {
  if (!story.subtasks || story.subtasks.length === 0) {
    return { complete: true, incomplete: [], total: 0, completed: 0 };
  }

  const incomplete = story.subtasks.filter(s => s.status !== 'done');

  return {
    complete: incomplete.length === 0,
    incomplete,
    total: story.subtasks.length,
    completed: story.subtasks.length - incomplete.length
  };
}

/**
 * Check if story dependencies are met
 * @param storyId - Story ID to check
 * @param allStories - All stories
 * @returns Dependencies check result
 */
export function checkDependenciesMet(storyId: string, allStories: Story[]): DependenciesResult {
  const story = allStories.find(s => s.id === storyId);

  if (!story?.dependent_upon || story.dependent_upon.length === 0) {
    return { met: true, blocking: [] };
  }

  const blocking: Story[] = [];
  for (const depId of story.dependent_upon) {
    const depStory = allStories.find(s => s.id === depId);
    if (!depStory || depStory.status !== 'done') {
      // Create a placeholder story if not found
      blocking.push(depStory ?? { id: depId, status: 'todo', phase: 'MVP', title: 'Not found' } as Story);
    }
  }

  return {
    met: blocking.length === 0,
    blocking
  };
}

/**
 * Validate a status transition is logical
 * @param currentStatus - Current status
 * @param newStatus - New status
 * @param type - 'story' or 'subtask'
 * @returns Status transition validation result
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): StatusTransitionResult {
  if (currentStatus === newStatus) {
    return { valid: false, reason: 'Status is already ' + newStatus };
  }

  // Allow any transition for now - workflow rules handle the constraints
  return { valid: true };
}

/**
 * Validate dependency IDs for stories or subtasks
 * @param dependencyIds - Array of dependency IDs to validate
 * @param type - 'story' or 'subtask'
 * @param parentStoryId - Parent story ID (required for subtask validation)
 * @param allStories - All stories (optional, for existence checks)
 * @returns Validation result with invalid IDs and error messages
 */
export function validateDependencyIds(
  dependencyIds: string[],
  type: 'story' | 'subtask',
  parentStoryId?: string,
  allStories?: Story[]
): DependencyValidationResult {
  const invalidIds: string[] = [];
  const errors: string[] = [];

  if (!dependencyIds || dependencyIds.length === 0) {
    return { valid: true, invalidIds: [], errors: [] };
  }

  for (const depId of dependencyIds) {
    if (type === 'subtask') {
      // Subtask dependencies must be in format: STORY-ID-NUM (e.g., MVP-001-1)
      const subtaskPattern = /^[A-Z]+-\d+-\d+$/;

      if (!subtaskPattern.test(depId)) {
        invalidIds.push(depId);
        errors.push(`Invalid subtask ID format: "${depId}". Expected format: PHASE-NUM-NUM (e.g., MVP-001-1)`);
        continue;
      }

      // Check that subtask belongs to same parent story
      if (parentStoryId) {
        if (!depId.startsWith(parentStoryId + '-')) {
          invalidIds.push(depId);
          errors.push(`Subtask dependency "${depId}" does not belong to parent story "${parentStoryId}"`);
          continue;
        }
      }

      // If allStories provided, verify subtask exists
      if (allStories && parentStoryId) {
        const parentStory = allStories.find(s => s.id === parentStoryId);
        if (parentStory?.subtasks) {
          const subtaskExists = parentStory.subtasks.some(st => st.id === depId);
          if (!subtaskExists) {
            invalidIds.push(depId);
            errors.push(`Subtask "${depId}" does not exist in story "${parentStoryId}"`);
          }
        }
      }
    } else {
      // Story dependencies must be in format: PHASE-NUM (e.g., MVP-001)
      const storyPattern = /^[A-Z]+-\d+$/;

      if (!storyPattern.test(depId)) {
        invalidIds.push(depId);
        errors.push(`Invalid story ID format: "${depId}". Expected format: PHASE-NUM (e.g., MVP-001)`);
        continue;
      }

      // If allStories provided, verify story exists
      if (allStories) {
        const storyExists = allStories.some(s => s.id === depId);
        if (!storyExists) {
          invalidIds.push(depId);
          errors.push(`Story "${depId}" does not exist`);
        }
      }
    }
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds,
    errors
  };
}

/**
 * Validate that a phase exists in the configuration
 * @param phase - Phase name to validate
 * @param config - Config object (optional, will read if not provided)
 * @throws CCDevToolsError if phase is invalid
 */
export async function validatePhase(phase: string, config: Config | null = null): Promise<void> {
  if (!config) {
    config = await readConfig();
  }

  if (!config.phases.includes(phase)) {
    const { createInvalidInputError } = await import('../../shared/errors.js');
    throw createInvalidInputError(
      `Invalid phase: "${phase}". Allowed phases: ${config.phases.join(', ')}`,
      { allowedPhases: config.phases }
    );
  }
}
