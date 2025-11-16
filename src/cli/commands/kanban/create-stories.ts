import { generateNextStoryId, saveStory, readAllStories, readConfig } from '../../../kanban/services/storage.js';
import { validatePhase, validateDependencyIds } from '../../../kanban/services/validation.js';
import { ErrorCodes, type Story, type BusinessValue, type KanbanError } from '../../../kanban/types.js';
import { createInvalidInputError } from '../../../shared/errors.js';
import { formatValidationError } from '../../core/format-specs.js';
import { parseJSON, validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';
import { createStoriesFormatSpec } from '../../core/types.js';

import type { CLIResponse } from '../../types.js';

interface StorySpec {
  title: string;
  description?: string;
  details?: string;
  phase?: string;
  business_value?: BusinessValue;
  effort_estimation_hours?: number;
  labels?: string[];
  dependent_upon?: string[];
  planning_notes?: string;
  acceptance_criteria?: string[];
  relevant_documentation?: string[];
  implementation_notes?: string;
}

interface CreateStoriesInput {
  stories: StorySpec[];
}

/**
 * Create one or more stories from JSON input (bulk creation supported)
 */
export async function createStoriesCommand(
  positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 1, 'create-stories \'{"stories":[...]}\'');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'create-stories \'{"stories":[...] }\'' });
    }

    const jsonString = positional[0];
    const parseResult = parseJSON<CreateStoriesInput>(jsonString);

    if (!parseResult.success) {
      throw createInvalidInputError(parseResult.error ?? '', { usage: 'create-stories \'{"stories":[...] }\'' });
    }

    const input = parseResult.data!;

    if (!input.stories || !Array.isArray(input.stories)) {
      const errorMessage = formatValidationError(
        'Missing or invalid "stories" property. Input must contain a "stories" array.',
        createStoriesFormatSpec,
        'Example: npx cc-devtools kanban create-stories \'{"stories":[{"title":"Add login feature"}]}\''
      );
      throw createInvalidInputError(errorMessage, { usage: 'create-stories \'{"stories":[...] }\'' });
    }

    if (input.stories.length === 0) {
      throw createInvalidInputError('The "stories" array cannot be empty. Please provide at least one story to create.');
    }

    for (let i = 0; i < input.stories.length; i++) {
      const story = input.stories[i];
      if (!story.title || typeof story.title !== 'string' || story.title.trim() === '') {
        throw createInvalidInputError(
          `Story at index ${i} is missing required "title" field. Each story must have a non-empty title string.`
        );
      }
    }

    // Validate dependencies for all stories before creating any
    const allStories = await readAllStories();
    for (const storySpec of input.stories) {
      if (storySpec.dependent_upon && storySpec.dependent_upon.length > 0) {
        const validation = validateDependencyIds(
          storySpec.dependent_upon,
          'story',
          undefined,
          allStories
        );

        if (!validation.valid) {
          throw createInvalidInputError(
            `Invalid dependencies for story "${storySpec.title}": ${validation.errors.join('; ')}`,
            { invalidIds: validation.invalidIds, errors: validation.errors }
          );
        }
      }
    }

    const created: Array<{ id: string; title: string }> = [];
    const timestamp = new Date().toISOString();

    // Load config to get the first configured phase as default
    const config = await readConfig();
    const defaultPhase = config.phases?.[0];

    for (const storySpec of input.stories) {
      const phase = storySpec.phase ?? defaultPhase;

      if (!phase) {
        throw createInvalidInputError('No phase specified and no default phase configured in .kanban/config.yaml');
      }

      await validatePhase(phase);

      const storyId = await generateNextStoryId(phase);

      const story: Story = {
        id: storyId,
        title: storySpec.title,
        description: storySpec.description,
        details: storySpec.details,
        status: 'todo',
        business_value: storySpec.business_value,
        phase,
        effort_estimation_hours: storySpec.effort_estimation_hours,
        completion_timestamp: undefined,
        dependent_upon: storySpec.dependent_upon ?? [],
        labels: storySpec.labels ?? [],
        planning_notes: storySpec.planning_notes,
        acceptance_criteria: storySpec.acceptance_criteria,
        relevant_documentation: storySpec.relevant_documentation,
        implementation_notes: storySpec.implementation_notes ?? null,
        updated_at: timestamp,
        subtasks: []
      };

      await saveStory(story);
      created.push({
        id: storyId,
        title: story.title
      });
    }

    const summary = {
      count: created.length,
      byPhase: {} as Record<string, number>,
      byValue: {} as Record<string, number>,
      totalEffort: 0
    };

    for (const storySpec of input.stories) {
      const phase = storySpec.phase ?? 'MVP';
      summary.byPhase[phase] = (summary.byPhase[phase] ?? 0) + 1;

      const value = storySpec.business_value;
      if (value) {
        summary.byValue[value] = (summary.byValue[value] ?? 0) + 1;
      }

      summary.totalEffort += storySpec.effort_estimation_hours ?? 0;
    }

    return buildSuccess('create-stories', {
      created,
      summary
    });

  } catch (error) {
    const err = error as KanbanError;
    return buildError('create-stories', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
