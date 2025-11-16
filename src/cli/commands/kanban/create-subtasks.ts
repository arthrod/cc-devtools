import { readStory, saveStory, readAllStories } from '../../../kanban/services/storage.js';
import { validateDependencyIds } from '../../../kanban/services/validation.js';
import { ErrorCodes, type Subtask, type KanbanError } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { formatValidationError } from '../../core/format-specs.js';
import { parseJSON, validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';
import { createSubtasksFormatSpec } from '../../core/types.js';

import type { CLIResponse } from '../../types.js';

type SubtaskSpec = Pick<Subtask, 'title' | 'description' | 'details' | 'effort_estimation_hours' | 'dependent_upon' | 'planning_notes' | 'acceptance_criteria' | 'relevant_documentation' | 'implementation_notes'>;

interface CreateSubtasksInput {
  subtasks: SubtaskSpec[];
  complexityAnalysis?: string;
}

/**
 * Create one or more subtasks for a story from JSON input (bulk creation supported)
 */
export async function createSubtasksCommand(
  positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 2, 'create-subtasks <storyId> \'{"subtasks":[...]}\'');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'create-subtasks <storyId> \'{"subtasks":[...] }\'' });
    }

    const storyId = positional[0];
    const jsonString = positional[1];

    const parseResult = parseJSON<CreateSubtasksInput>(jsonString);

    if (!parseResult.success) {
      throw createInvalidInputError(parseResult.error ?? '', { usage: 'create-subtasks <storyId> \'{"subtasks":[...] }\'' });
    }

    const input = parseResult.data!;

    if (!input.subtasks || !Array.isArray(input.subtasks)) {
      const errorMessage = formatValidationError(
        'Missing or invalid "subtasks" property. Input must contain a "subtasks" array.',
        createSubtasksFormatSpec,
        'Example: npx cc-devtools kanban create-subtasks MVP-001 \'{"subtasks":[{"title":"Write tests"}]}\''
      );
      throw createInvalidInputError(errorMessage, { usage: 'create-subtasks <storyId> \'{"subtasks":[...] }\'' });
    }

    if (input.subtasks.length === 0) {
      throw createInvalidInputError('The "subtasks" array cannot be empty. Please provide at least one subtask to create.');
    }

    for (let i = 0; i < input.subtasks.length; i++) {
      const subtask = input.subtasks[i];
      if (!subtask.title || typeof subtask.title !== 'string' || subtask.title.trim() === '') {
        throw createInvalidInputError(
          `Subtask at index ${i} is missing required "title" field. Each subtask must have a non-empty title string.`
        );
      }
    }

    const story = await readStory(storyId);

    if (!story) {
      throw createNotFoundError(`Story ${storyId} not found`);
    }

    // Validate dependencies for all subtasks before creating any
    const allStories = await readAllStories();
    for (const subtaskSpec of input.subtasks) {
      if (subtaskSpec.dependent_upon && subtaskSpec.dependent_upon.length > 0) {
        const validation = validateDependencyIds(
          subtaskSpec.dependent_upon,
          'subtask',
          storyId,
          allStories
        );

        if (!validation.valid) {
          throw createInvalidInputError(
            `Invalid dependencies for subtask "${subtaskSpec.title}": ${validation.errors.join('; ')}`,
            { invalidIds: validation.invalidIds, errors: validation.errors }
          );
        }
      }
    }

    const existingSubtasks = story.subtasks ?? [];
    let nextNum = 1;

    if (existingSubtasks.length > 0) {
      const maxNum = Math.max(...existingSubtasks.map(st => {
        const match = st.id.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      nextNum = maxNum + 1;
    }

    const timestamp = new Date().toISOString();
    const created: Array<{ id: string; title: string }> = [];
    const newSubtasks: Subtask[] = [];

    for (const subtaskSpec of input.subtasks) {
      const subtaskId = `${storyId}-${nextNum}`;

      const subtask: Subtask = {
        id: subtaskId,
        title: subtaskSpec.title,
        description: subtaskSpec.description,
        details: subtaskSpec.details,
        status: 'todo',
        effort_estimation_hours: subtaskSpec.effort_estimation_hours,
        completion_timestamp: undefined,
        dependent_upon: subtaskSpec.dependent_upon ?? [],
        planning_notes: subtaskSpec.planning_notes,
        acceptance_criteria: subtaskSpec.acceptance_criteria,
        relevant_documentation: subtaskSpec.relevant_documentation,
        implementation_notes: subtaskSpec.implementation_notes,
        updated_at: timestamp
      };

      newSubtasks.push(subtask);
      created.push({
        id: subtaskId,
        title: subtask.title
      });

      nextNum++;
    }

    story.subtasks = [...existingSubtasks, ...newSubtasks];
    story.updated_at = timestamp;

    // Add complexity analysis to implementation notes if provided
    if (input.complexityAnalysis) {
      if (story.implementation_notes?.includes('## Complexity Analysis')) {
        story.implementation_notes = story.implementation_notes.replace(
          /## Complexity Analysis[\s\S]*?(?=\n##|\n$|$)/,
          input.complexityAnalysis
        );
      } else {
        story.implementation_notes = (story.implementation_notes ?? '') + '\n\n' + input.complexityAnalysis;
      }
    }

    await saveStory(story);

    const summary = {
      count: created.length,
      totalEffort: newSubtasks.reduce((sum, st) => sum + (st.effort_estimation_hours ?? 0), 0),
      avgEffort: 0
    };

    if (summary.count > 0) {
      summary.avgEffort = Math.round((summary.totalEffort / summary.count) * 10) / 10;
    }

    return buildSuccess('create-subtasks', {
      storyId,
      created,
      summary,
      story
    });

  } catch (error) {
    const err = error as KanbanError;
    return buildError('create-subtasks', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
