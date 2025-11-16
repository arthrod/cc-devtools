/**
 * Review system types
 */

/**
 * Individual reviewer configuration
 */
export interface ReviewerConfig {
  name: string;
  enabled: boolean;
  command: string;
  args: string[];
  timeout: number;
}

/**
 * Complete review configuration
 */
export interface ReviewConfig {
  version: number;
  defaults: {
    timeout: number;
    metadataDir: string;
    promptTemplate: string;
  };
  reviewers: ReviewerConfig[];
  review: {
    autoGenerate: boolean;
    autoCleanup: boolean;
    storage: {
      enabled: boolean;
      storeFalsePositives: boolean;
    };
  };
}

/**
 * Review metadata stored in .tmp/
 */
export interface ReviewMetadata {
  story_id: string;
  round_number: number;
}

/**
 * Result from running a single reviewer
 */
export interface ReviewerResult {
  success: boolean;
  output: string;
  error?: string;
  timedOut?: boolean;
}

/**
 * Context for generating review prompts
 */
export interface ReviewPromptContext {
  storyId: string;
  storyTitle: string;
  roundNumber: number;
  gitBranch: string;
}

/**
 * Review orchestration result
 */
export interface ReviewOrchestrationResult {
  successful: number;
  failed: number;
  timedOut: number;
  results: Array<{
    reviewer: string;
    result: ReviewerResult;
  }>;
}

/**
 * Parsed kanban review rounds data from CLI
 */
export interface KanbanRoundsData {
  data?: {
    rounds?: Array<{ round: number }>;
  };
}
