import { readStory, saveStory, parseId } from '../../../kanban/services/storage.js';
import { ErrorCodes, type KanbanError, type Subtask } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

type AppendableField = 'planning_notes' | 'implementation_notes';

const APPENDABLE_FIELDS: AppendableField[] = ['planning_notes', 'implementation_notes'];

/**
 * Append content to subtask fields to avoid sending large field replacements
 */
export async function appendSubtaskFieldCommand(
  positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 3, 'append-subtask-field <ID> <field> <content>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'append-subtask-field <ID> <field> <content>' });
    }

    const id = positional[0];
    const field = positional[1];
    const content = positional[2];

    if (!content || content.length === 0) {
      throw createInvalidInputError('Content cannot be empty');
    }

    const parsed = parseId(id);

    if (parsed.type !== 'subtask') {
      throw createInvalidInputError('Cannot append to story using append-subtask-field. Use append-story-field instead.', {
        usage: 'append-subtask-field <subtaskId> <field> <content>'
      });
    }

    if (!APPENDABLE_FIELDS.includes(field as AppendableField)) {
      throw createInvalidInputError(
        `Invalid field: ${field}. Must be one of: ${APPENDABLE_FIELDS.join(', ')}`,
        { availableFields: APPENDABLE_FIELDS }
      );
    }

    const story = await readStory(parsed.storyId);

    if (!story) {
      throw createNotFoundError(`Story ${parsed.storyId} not found`);
    }

    const subtask = story.subtasks?.find(st => st.id === id);

    if (!subtask) {
      throw createNotFoundError(`Subtask ${id} not found`);
    }

    const timestamp = new Date().toISOString();
    const typedField = field as AppendableField;

    const currentValue = subtask[typedField] ?? '';
    const separator = currentValue.length > 0 ? '\n\n' : '';
    const newValue = `${currentValue}${separator}${content}`;

    const updates: Partial<Pick<Subtask, AppendableField>> = {
      [typedField]: newValue
    };

    Object.assign(subtask, updates);
    subtask.updated_at = timestamp;
    story.updated_at = timestamp;

    await saveStory(story);

    return buildSuccess('append-subtask-field', {
      id: subtask.id,
      storyId: story.id,
      field: typedField,
      appendedContent: content,
      previousLength: currentValue.length,
      newLength: newValue.length,
      timestamp,
      subtask
    });

  } catch (error) {
    const err = error as KanbanError;
    const additionalData = err.details ?? {};
    return buildError('append-subtask-field', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR, additionalData);
  }
}
