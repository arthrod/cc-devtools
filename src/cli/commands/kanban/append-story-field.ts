import { readStory, saveStory, parseId } from '../../../kanban/services/storage.js';
import { ErrorCodes, type KanbanError, type Story } from '../../../kanban/types.js';
import { createNotFoundError, createInvalidInputError } from '../../../shared/errors.js';
import { validatePositionalArgs } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

type AppendableField = 'planning_notes' | 'implementation_notes';

const APPENDABLE_FIELDS: AppendableField[] = ['planning_notes', 'implementation_notes'];

/**
 * Append content to story fields to avoid sending large field replacements
 */
export async function appendStoryFieldCommand(
  positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const validation = validatePositionalArgs(positional, 3, 'append-story-field <ID> <field> <content>');
    if (!validation.valid) {
      throw createInvalidInputError(validation.error ?? '', { usage: 'append-story-field <ID> <field> <content>' });
    }

    const id = positional[0];
    const field = positional[1];
    const content = positional[2];

    if (!content || content.length === 0) {
      throw createInvalidInputError('Content cannot be empty');
    }

    const parsed = parseId(id);

    if (parsed.type !== 'story') {
      throw createInvalidInputError('Cannot append to subtask using append-story-field. Use append-subtask-field instead.', {
        usage: 'append-story-field <storyId> <field> <content>'
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

    const timestamp = new Date().toISOString();
    const typedField = field as AppendableField;

    const currentValue = story[typedField] ?? '';
    const separator = currentValue.length > 0 ? '\n\n' : '';
    const newValue = `${currentValue}${separator}${content}`;

    const updates: Partial<Pick<Story, AppendableField>> = {
      [typedField]: newValue
    };

    Object.assign(story, updates);
    story.updated_at = timestamp;

    await saveStory(story);

    return buildSuccess('append-story-field', {
      id: story.id,
      field: typedField,
      appendedContent: content,
      previousLength: currentValue.length,
      newLength: newValue.length,
      timestamp,
      story
    });

  } catch (error) {
    const err = error as KanbanError;
    const additionalData = err.details ?? {};
    return buildError('append-story-field', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR, additionalData);
  }
}
