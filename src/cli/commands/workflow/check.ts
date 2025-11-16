/**
 * Workflow check command - analyze current workflow state
 */

import { executeWorkflow } from '../../../workflow/index.js';
import { getOption } from '../../core/parser.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { ErrorWithCode } from '../../../shared/types/common.js';
import type { WorkflowResult } from '../../../workflow/types/workflow.js';

/**
 * Execute workflow check command
 */
export async function checkCommand(
  _positional: string[],
  options: Record<string, string | boolean>
): Promise<unknown> {
  try {
    const configPath = getOption<string | undefined>(options, 'config', undefined);

    // Execute workflow engine (it handles config loading internally)
    const result: WorkflowResult = await executeWorkflow(configPath);

    // Return structured result
    return buildSuccess('workflow check', {
      state: result.state,
      git: result.gitState,
      kanban: result.kanbanState,
      action: result.actionNecessary,
      options: result.options,
      warning: result.warning,
      error: result.error,
    });
  } catch (error) {
    const err = error as ErrorWithCode;
    return buildError(
      'workflow check',
      err.message ?? 'Failed to execute workflow check',
      err.code ?? 'WORKFLOW_ERROR'
    );
  }
}
