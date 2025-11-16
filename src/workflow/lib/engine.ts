/**
 * Workflow engine - main orchestration logic
 */

import { join } from 'path';

import type { WorkflowResult } from '../types/workflow.js';

import { loadWorkflowConfig } from './config.js';
import { loadDecisionTree, walkDecisionTree } from './decision-tree.js';
import { WorkflowLogger } from './logger.js';
import { getGitState, deriveStateVariables } from './state-reader.js';

/**
 * Execute workflow check
 * Main entry point for workflow state analysis
 */
export async function executeWorkflow(configPath?: string): Promise<WorkflowResult> {
  const config = loadWorkflowConfig(configPath);

  const logFile = join(process.cwd(), config.logging.file);
  const logger = new WorkflowLogger(
    logFile,
    config.logging.enabled,
    config.logging.level
  );

  logger.info('========== Workflow check started ==========');

  try {
    const gitState = getGitState(logger);
    if (!gitState) {
      throw new Error('Failed to read git state');
    }

    const stateVars = await deriveStateVariables(gitState, logger);

    let decisionTreePath: string | undefined;
    if (config.decisionTree.source === 'file' && config.decisionTree.path) {
      decisionTreePath = config.decisionTree.path;
    }
    const decisions = loadDecisionTree(decisionTreePath, logger);

    const result = walkDecisionTree(decisions, stateVars, logger);

    logger.info('Workflow state determined', { state: result.state });
    logger.info('Returning result', { result });
    logger.info('========== Workflow check completed ==========\n');

    return result;
  } catch (error) {
    logger.error('Workflow check failed with exception', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}
