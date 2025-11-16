/**
 * Core plan type definitions
 */

import type { WithScore } from '../shared/types/common.js';
import type { StoreResponse, BaseResponse } from '../shared/types/responses.js';

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

// @type-duplicate-allowed
export type PlanSummary = Pick<Plan, 'id' | 'summary' | 'goal' | 'status' | 'created_at' | 'updated_at'> & {
  score?: number;
  match_reason?: string;
};

export type PlanWithScore = WithScore<Plan>;

export interface EmbeddingCache {
  [id: string]: number[] | null;
}

export type { StoreResponse };

export interface SearchResponse extends BaseResponse {
  results?: (Plan | PlanSummary)[];
  guidance?: string;
}

export type UpdateResponse = BaseResponse;

export interface TaskUpdate {
  index: number;
  status: TaskStatus;
}

export interface NewTask {
  summary: string;
  details?: string;
  status?: TaskStatus;
}

/**
 * Search tool arguments
 */
export interface SearchArgs {
  query?: string;
  id?: string;
  status?: string;
  limit?: number;
  summary_only?: boolean;
  include_all_statuses?: boolean;
}

/**
 * Store tool arguments
 */
export interface StoreArgs {
  id: string;
  summary: string;
  goal: string;
  decisions: string;
  implementation_plan: string;
  tasks: Task[];
}

/**
 * Update tool arguments
 */
export interface UpdateArgs {
  id: string;
  task_updates?: TaskUpdate[];
  new_tasks?: NewTask[];
  add_note?: string;
  plan_status?: PlanStatus;
}
