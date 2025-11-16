/**
 * Workflow feature public API
 */

// Engine
export { executeWorkflow } from './lib/engine.js';

// State reading
export { getGitState, deriveStateVariables } from './lib/state-reader.js';

// Decision tree
export {
  loadDecisionTree,
  walkDecisionTree,
  safeEval,
  substituteVariables,
  generateDynamicOptions,
} from './lib/decision-tree.js';

// Configuration
export { loadWorkflowConfig, getDefaultConfig } from './lib/config.js';

// Logger
export { WorkflowLogger } from './lib/logger.js';

// Review orchestration
export {
  executeAutomatedReview,
  generateReviewMetadata,
  generateAndSaveReviewPrompt,
  cleanupReviewMetadata,
} from './review/orchestrator.js';

// Review configuration
export { loadReviewConfig, getEnabledReviewers, getDefaultReviewConfig } from './review/config.js';

// Review components
export { generateReviewPrompt } from './review/prompt-generator.js';
export { runReviewer } from './review/reviewer-runner.js';
export { postProcessReview } from './review/post-processor.js';

// Note: Types are NOT re-exported from this index file.
// Import types directly from their source files:
// - import type { WorkflowState, WorkflowResult, ... } from '@shaenchen/cc-devtools/dist/workflow/types/workflow.js'
// - import type { ReviewerConfig, ReviewConfig, ... } from '@shaenchen/cc-devtools/dist/workflow/types/review.js'
