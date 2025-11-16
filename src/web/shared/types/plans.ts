/**
 * Shared types for Plans API
 * Used by both server and client
 */

export type PlanStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'abandoned';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  summary: string;
  details?: string;
  status: TaskStatus;
}

export interface Plan {
  id: string;
  status: PlanStatus;
  summary: string;
  goal: string;
  decisions: string;
  implementation_plan: string;
  tasks: Task[];
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface PlanSummary {
  id: string;
  summary: string;
  goal: string;
  status: PlanStatus;
  created_at: number;
  updated_at: number;
  score?: number;
  match_reason?: string;
}

export interface PlanSearchResult extends Plan {
  score: number;
  match_reason: string;
}

/**
 * Plan search request parameters
 */
export interface PlanSearchParams {
  query?: string;
  id?: string;
  status?: string;
  limit?: number;
  summary_only?: boolean;
  include_all_statuses?: boolean;
}

/**
 * Plan search response
 */
export interface PlanSearchResponse {
  results: (Plan | PlanSummary)[];
  guidance?: string;
}

/**
 * Plan store request parameters
 */
export interface PlanStoreParams {
  id: string;
  summary: string;
  goal: string;
  decisions: string;
  implementation_plan: string;
  tasks: Task[];
}

/**
 * Plan store response
 */
export interface PlanStoreResponse {
  success: boolean;
  plan?: Plan;
  error?: string;
}

/**
 * Plan update request parameters
 */
export interface TaskUpdate {
  index: number;
  status: TaskStatus;
}

export interface NewTask {
  summary: string;
  details?: string;
  status?: TaskStatus;
}

export interface PlanUpdateParams {
  id: string;
  task_updates?: TaskUpdate[];
  new_tasks?: NewTask[];
  add_note?: string;
  plan_status?: PlanStatus;
}

/**
 * Plan update response
 */
export interface PlanUpdateResponse {
  success: boolean;
  plan?: Plan;
  error?: string;
}
