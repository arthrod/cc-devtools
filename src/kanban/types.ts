/**
 * Core types for the Kanban system
 */

/**
 * Re-export error codes and types from shared library
 */
export { ErrorCodes, type ErrorCode } from '../shared/types/errors.js';
export { type CCDevToolsError as KanbanError } from '../shared/errors.js';

/**
 * Story status types
 */
export type StoryStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

/**
 * Subtask status types
 */
export type SubtaskStatus = 'todo' | 'in_progress' | 'done';

/**
 * Business value types
 */
export type BusinessValue = 'XS' | 'S' | 'M' | 'L' | 'XL';

/**
 * Phase types - configurable via YAML, defaults to MVP, BETA, POSTRELEASE
 */
export type Phase = string;

/**
 * Subtask interface
 */
export interface Subtask {
  id: string;
  title: string;
  status: SubtaskStatus;
  description?: string;
  details?: string;
  effort_estimation_hours?: number;
  dependent_upon?: string[];
  completion_timestamp?: string;
  planning_notes?: string;
  acceptance_criteria?: string[];
  relevant_documentation?: string[];
  updated_at?: string;
  implementation_notes?: string;
}

/**
 * Story interface
 */
export interface Story {
  id: string;
  title: string;
  status: StoryStatus;
  phase: Phase;
  business_value?: BusinessValue;
  effort_estimation_hours?: number;
  labels?: string[];
  subtasks?: Subtask[];
  dependent_upon?: string[];
  completion_timestamp?: string;
  description?: string;
  details?: string;
  planning_notes?: string;
  acceptance_criteria?: string[];
  relevant_documentation?: string[];
  implementation_notes?: string | null;
  updated_at?: string;
}

/**
 * Workflow rules configuration
 */
export interface WorkflowRules {
  max_stories_in_progress: number;
  subtasks_require_story_in_progress: boolean;
  all_subtasks_completed_before_review: boolean;
}

/**
 * Default status configuration
 */
export interface DefaultStatus {
  story: StoryStatus;
  subtask: SubtaskStatus;
}

/**
 * Status configuration
 */
export interface StatusConfig {
  story: StoryStatus[];
  subtask: SubtaskStatus[];
}

/**
 * Configuration interface
 */
export interface Config {
  statuses: StatusConfig;
  business_values: BusinessValue[];
  phases: Phase[];
  default_status: DefaultStatus;
  workflow_rules: WorkflowRules;
}

/**
 * Main Kanban data structure
 */
export interface KanbanData {
  config: Config;
  stories: Story[];
}

/**
 * Parsed ID result
 */
export interface ParsedId {
  type: 'story' | 'subtask';
  storyId: string;
  subtaskNum?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  blockingStories?: Story[];
  incompleteSubtasks?: Subtask[];
  blockingDependencies?: string[];
}

/**
 * Status transition validation result
 */
export interface StatusTransitionResult {
  valid: boolean;
  reason?: string;
}

/**
 * Dependencies check result
 */
export interface DependenciesResult {
  met: boolean;
  blocking: Story[];
}

/**
 * Max in progress check result
 */
export interface MaxInProgressResult {
  violated: boolean;
  stories: Story[];
  limit: number;
}

/**
 * Subtasks completion check result
 */
export interface SubtasksCompleteResult {
  complete: boolean;
  incomplete: Subtask[];
  total: number;
  completed: number;
}

/**
 * Dependency validation result
 */
export interface DependencyValidationResult {
  valid: boolean;
  invalidIds: string[];
  errors: string[];
}

/**
 * Filter criteria for stories
 */
export interface FilterCriteria {
  status?: StoryStatus;
  phase?: Phase;
  label?: string;
  value?: BusinessValue;
  hasSubtasks?: boolean;
  ready?: boolean;
}

/**
 * Current work result
 */
export interface CurrentWork {
  story: Story;
  subtask?: Subtask;
}

/**
 * Ranked story with scoring metadata
 */
export interface RankedStory {
  story: Story;
  score: number;
  effort: number;
  reasons: string[];
}

/**
 * Progress information
 */
export interface Progress {
  completed: number;
  total: number;
  percentage: number;
  dots: string;
}

/**
 * Formatted story card
 */
export interface FormattedStoryCard {
  id: string;
  title: string;
  value?: BusinessValue;
  status: StoryStatus;
  phase: Phase;
  effort?: number;
  labels: string[];
  progress: Progress;
  hasSubtasks: boolean;
  dependsOn: string[];
  completedAt?: string;
}

/**
 * Formatted subtask
 */
export interface FormattedSubtask {
  id: string;
  title: string;
  status: SubtaskStatus;
  effort?: number;
  dependsOn: string[];
  completedAt?: string;
  statusIcon: string;
}

/**
 * Work recommendation
 */
export interface WorkRecommendation {
  type: 'story' | 'subtask';
  story: Story;
  item: Story | Subtask;
  reason: string;
  score?: number;
  reasons?: string[];
  suggestion?: string;
  subtask?: Subtask;
}

/**
 * Progress analysis
 */
export interface ProgressAnalysis {
  hasSubtasks: boolean;
  complete: number;
  total: number;
  percentage: number;
  nextSubtask: Subtask | null;
}

/**
 * Status change suggestion
 */
export interface StatusChangeSuggestion {
  suggested: string | null;
  reason: string;
}

/**
 * Groups of stories by status
 */
export interface StoriesByStatus {
  todo: Story[];
  in_progress: Story[];
  in_review: Story[];
  done: Story[];
}

/**
 * Groups of stories by phase
 */
export interface StoriesByPhase {
  [phase: string]: Story[];
}

/**
 * Output mode for story/subtask formatting
 */
export type OutputMode = 'condensed' | 'full';

/**
 * Story review feedback
 */
export interface StoryReviewFeedback {
  storyId: string;
  round: number;
  reviewer: string;
  review: string;
  timestamp: string;
}

/**
 * Search result type
 */
export interface KanbanSearchResult {
  type: 'story' | 'subtask';
  id: string;
  story_id?: string;
  title: string;
  status: StoryStatus | SubtaskStatus;
  score: number;
  match_reason: string;
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  limit?: number;
  similarityThreshold?: number;
  scope?: 'stories' | 'subtasks' | 'both';
  status?: StoryStatus | SubtaskStatus;
  storyId?: string;
}
