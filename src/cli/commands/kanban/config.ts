import { readConfig } from '../../../kanban/services/storage.js';
import { ErrorCodes, type KanbanError } from '../../../kanban/types.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

/**
 * Get kanban configuration
 */
export async function configCommand(
  _positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  try {
    const config = await readConfig();

    return buildSuccess('config', {
      config
    });

  } catch (error) {
    const err = error as KanbanError;
    return buildError('config', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
  }
}
