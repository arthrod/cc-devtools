import { readStory, saveStory, parseId, readAllStories } from '../../../kanban/services/storage.js';
import { validateDependencyIds } from '../../../kanban/services/validation.js';
import { ErrorCodes, type KanbanError, type Story, type BusinessValue } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

type UpdateFields = Partial<Pick<Story, 'title' | 'description' | 'details' | 'phase' | 'business_value' | 'effort_estimation_hours' | 'labels' | 'dependent_upon' | 'planning_notes' | 'acceptance_criteria' | 'relevant_documentation' | 'implementation_notes'>>;

/**
 * Update story fields (excluding status, which should use 'move')
 */
export async function updateStoryCommand(
  positional: string[],
  options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 1, 'update-story <ID> [--field=value ...]');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'update-story <ID> [--field=value ...]' });
    }

    const id = positional[0];
    const parsed = parseId(id);

    if (parsed.type !== 'story') {
      throw createInvalidInputError('Cannot update subtask using update-story. Use update-subtask instead.', {
        usage: 'update-story <storyId> [--field=value ...]'
      });
    }

    const story = await readStory(parsed.storyId);

    if (!story) {
      throw createNotFoundError(`Story ${parsed.storyId} not found`);
    }

    const updates: UpdateFields = {};
    const updatedFields: string[] = [];

    // Extract update fields from options
    if (typeof options.title === 'string' && options.title.length > 0) {
      updates.title = options.title;
      updatedFields.push('title');
    }

    if (typeof options.description === 'string') {
      updates.description = options.description;
      updatedFields.push('description');
    }

    if (typeof options.details === 'string') {
      updates.details = options.details;
      updatedFields.push('details');
    }

    if (typeof options.phase === 'string' && options.phase.length > 0) {
      throw createInvalidInputError(
        'Cannot change story phase after creation. The story ID is based on the phase and cannot be changed. ' +
        'If you need to move a story to a different phase, create a new story in the target phase and archive this one.',
        { currentPhase: story.phase, attemptedPhase: options.phase }
      );
    }

    if (typeof options.business_value === 'string') {
      const value = options.business_value.toUpperCase();
      if (!['XS', 'S', 'M', 'L', 'XL'].includes(value)) {
        throw createInvalidInputError(
          `Invalid business_value: ${options.business_value}. Must be one of: XS, S, M, L, XL`
        );
      }
      updates.business_value = value as BusinessValue;
      updatedFields.push('business_value');
    }

    if (typeof options.effort === 'string') {
      const effort = parseFloat(options.effort);
      if (isNaN(effort) || effort < 0) {
        throw createInvalidInputError(`Invalid effort: ${options.effort}. Must be a positive number.`);
      }
      updates.effort_estimation_hours = effort;
      updatedFields.push('effort_estimation_hours');
    }

    if (typeof options.labels === 'string') {
      updates.labels = options.labels.split(',').map(l => l.trim()).filter(l => l.length > 0);
      updatedFields.push('labels');
    }

    if (typeof options.dependent_upon === 'string') {
      const dependencyIds = options.dependent_upon.split(',').map(d => d.trim()).filter(d => d.length > 0);

      // Validate dependency IDs
      if (dependencyIds.length > 0) {
        const allStories = await readAllStories();
        const validation = validateDependencyIds(
          dependencyIds,
          'story',
          undefined,
          allStories
        );

        if (!validation.valid) {
          throw createInvalidInputError(
            `Invalid dependencies: ${validation.errors.join('; ')}`,
            { invalidIds: validation.invalidIds, errors: validation.errors }
          );
        }
      }

      updates.dependent_upon = dependencyIds;
      updatedFields.push('dependent_upon');
    }

    if (typeof options.planning_notes === 'string') {
      updates.planning_notes = options.planning_notes;
      updatedFields.push('planning_notes');
    }

    if (typeof options.acceptance_criteria === 'string') {
      updates.acceptance_criteria = options.acceptance_criteria.split(',').map(c => c.trim()).filter(c => c.length > 0);
      updatedFields.push('acceptance_criteria');
    }

    if (typeof options.relevant_documentation === 'string') {
      updates.relevant_documentation = options.relevant_documentation.split(',').map(d => d.trim()).filter(d => d.length > 0);
      updatedFields.push('relevant_documentation');
    }

    if (typeof options.implementation_notes === 'string') {
      updates.implementation_notes = options.implementation_notes;
      updatedFields.push('implementation_notes');
    }

    if (updatedFields.length === 0) {
      throw createInvalidInputError('No valid update fields provided', {
        availableFields: [
          'title', 'description', 'details', 'phase', 'business_value', 'effort',
          'labels', 'dependent_upon', 'planning_notes', 'acceptance_criteria',
          'relevant_documentation', 'implementation_notes'
        ]
      });
    }

    const timestamp = new Date().toISOString();

    Object.assign(story, updates);
    story.updated_at = timestamp;

    await saveStory(story);

    return buildSuccess('update-story', {
      id: story.id,
      updatedFields,
      updates,
      timestamp,
      story
    });

  } catch (error) {
    const err = error as KanbanError;
    const additionalData = err.details ?? {};
    return buildError('update-story', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR, additionalData);
  }
}
