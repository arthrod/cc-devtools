/**
 * Workflow system types
 */

import type { Story, Subtask } from '../../kanban/types.js';

/**
 * Git state information
 */
export interface WorkflowState {
  git_branch: string;
  git_clean: boolean;
  git_last_commit_is_finalized: boolean;
  modified_files: string[];
  untracked_files: string[];
}

/**
 * Derived kanban state variables
 * These are computed from raw kanban data and used in decision tree conditions
 */
export interface KanbanState {
  total_stories: number;
  stories_in_progress: Story[];
  stories_in_review: Story[];
  stories_done: Story[];
  stories_todo: Story[];
  stories_blocked: Story[];
  current_story: Story | null;
  current_story_id: string | null;
  current_story_status: string | null;
  current_story_subtasks: Subtask[] | null;
  subtasks_in_progress: number;
  subtasks_todo: number;
  subtasks_done: number;
  current_subtask: Subtask | null;
  current_subtask_id: string | null;
  next_subtask: Subtask | null;
  next_subtask_id: string | null;
  next_subtask_title: string | null;
  next_story: Story | null;
  next_story_id: string | null;
  next_story_title: string | null;
  current_branch_story_id: string | null;
  on_feature_branch_for_done_story: boolean;
  first_done_story_id: string | null;
  done_story_feature_branch_exists: boolean;
  done_story_feature_branch_name: string | null;
  done_story_feature_branch_merged: boolean;
  feature_branch_exists_for_current_story: boolean;
}

/**
 * Combined state variables (git + kanban) used in decision tree
 */
export interface StateVariables extends WorkflowState, KanbanState {}

/**
 * Decision tree node definition
 */
export interface DecisionTreeNode {
  name: string;
  condition: string;
  if_true: DecisionTreeBranch;
  if_false: DecisionTreeBranch;
}

/**
 * Decision tree branch (either points to another decision or a terminal state)
 */
export type DecisionTreeBranch = string | TerminalState;

/**
 * Terminal state in decision tree
 */
export interface TerminalState {
  state: string;
  action_type: 'action' | 'suggest' | 'error' | 'options' | 'options_dynamic';
  action?: string;
  options?: Option[];
  warning?: string;
}

/**
 * Option presented to user in decision tree
 */
export interface Option {
  option: string;
  description: string;
  actionNecessary?: string;
  action?: string;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  state: string;
  gitState: {
    current_branch: string;
    clean: boolean;
    last_commit_is_finalized: boolean;
  };
  kanbanState: {
    current_item?: {
      id: string;
      title: string;
      status: string;
      type: 'story' | 'subtask';
    };
    next_item?: {
      id: string;
      title: string;
      status: string;
      type: 'story' | 'subtask';
    };
  };
  actionNecessary?: string;
  options?: Option[];
  error?: string;
  warning?: string;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  version: number;
  decisionTree: {
    source: 'default' | 'file';
    path?: string;
  };
  logging: {
    enabled: boolean;
    file: string;
    level: 'info' | 'debug' | 'error';
  };
  kanban: {
    mode: 'internal' | 'cli';
  };
}

/**
 * Parsed YAML decision tree format
 */
export interface ParsedDecisionTree {
  decisions: DecisionTreeNode[];
}

/**
 * Parsed story ID components
 */
export interface ParsedStoryId {
  phase: string;
  num: number;
}

/**
 * Workflow logger type (re-exported for type architecture compliance)
 * Import the actual WorkflowLogger class from lib/logger.js for instantiation
 */
export type { WorkflowLogger } from '../lib/logger.js';
