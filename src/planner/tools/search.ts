/**
 * Plan search tool implementation
 */

import { readPlan, readAllPlans } from '../core/storage.js';
import { hybridSearch } from '../services/search.js';
import type { Plan, PlanSummary, SearchResponse, SearchArgs } from '../types.js';

import { createValidationError, createNotFoundError } from '../../shared/errors.js';

/**
 * Convert plan to summary format
 */
function toSummary(plan: Plan & { score?: number; match_reason?: string }): PlanSummary {
  return {
    id: plan.id,
    summary: plan.summary,
    goal: plan.goal,
    status: plan.status,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
    score: plan.score,
    match_reason: plan.match_reason
  };
}

/**
 * Search for plans
 */
export async function search(args: SearchArgs): Promise<SearchResponse> {
  const {
    query,
    id,
    status,
    limit = 1,
    summary_only = true,
    include_all_statuses = false
  } = args;

  if (limit < 1 || limit > 20) {
    throw createValidationError('Limit must be between 1 and 20');
  }

  if (id) {
    const plan = readPlan(id);

    if (!plan) {
      throw createNotFoundError(`Plan with id "${id}" not found`);
    }

      const result = summary_only
        ? [toSummary({ ...plan, score: 1.0, match_reason: 'exact id match' })]
        : [{ ...plan, score: 1.0, match_reason: 'exact id match' }];

      // Add guidance for full plan retrieval
      const guidance = !summary_only
        ? '\n\n📋 INSTRUCTIONS: As you work through this plan, mark each task as completed immediately after finishing it using plan_update. When all tasks are done, update plan_status to "completed".'
        : undefined;

    return {
      success: true,
      results: result,
      ...(guidance && { guidance })
    };
  }

  let allPlans = readAllPlans();

  // Filter by status if provided
  if (status) {
    allPlans = allPlans.filter(plan => plan.status === status);
  }

  if (allPlans.length === 0) {
    return {
      success: true,
      results: []
    };
  }

  const searchResults = await hybridSearch(
    query ?? '',
    allPlans,
    limit,
    include_all_statuses
  );

  if (summary_only) {
    return {
      success: true,
      results: searchResults.map(toSummary)
    };
  }

  // Add guidance for full plan results
  return {
    success: true,
    results: searchResults,
    guidance: '📋 INSTRUCTIONS: As you work through these plans, mark each task as completed immediately after finishing it using plan_update. When all tasks are done, update plan_status to "completed".'
  };
}
