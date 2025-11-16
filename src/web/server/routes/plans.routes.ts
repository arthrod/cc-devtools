/**
 * Plans API routes
 * RESTful endpoints for plan search, storage, and updates
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import * as logger from '../utils/logger.js';

import { readAllPlans, readPlan, savePlan, planExists, deletePlan } from '../../../planner/core/storage.js';
import { hybridSearch as searchPlans } from '../../../planner/services/search.js';

import type { Plan, Task, PlanStatus, TaskStatus } from '../../../planner/types.js';
import type {
  PlanSearchParams,
  PlanSearchResponse,
  PlanStoreParams,
  PlanStoreResponse,
  PlanUpdateParams,
  PlanUpdateResponse
} from '../../shared/types/plans.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const taskSchema = z.object({
  summary: z.string().min(1),
  details: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed'])
});

const searchSchema = z.object({
  query: z.string().optional(),
  id: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().positive().optional(),
  summary_only: z.boolean().optional(),
  include_all_statuses: z.boolean().optional()
});

const storeSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  goal: z.string(),
  decisions: z.string(),
  implementation_plan: z.string(),
  tasks: z.array(taskSchema)
});

const taskUpdateSchema = z.object({
  index: z.number().int().min(0),
  status: z.enum(['pending', 'in_progress', 'completed'])
});

const newTaskSchema = z.object({
  summary: z.string().min(1),
  details: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional()
});

const updateSchema = z.object({
  id: z.string().min(1),
  task_updates: z.array(taskUpdateSchema).optional(),
  new_tasks: z.array(newTaskSchema).optional(),
  add_note: z.string().optional(),
  plan_status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'abandoned']).optional()
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle async route errors
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: (err: unknown) => void): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * Send error response with consistent format
 */
function sendError(res: Response, statusCode: number, message: string, code: string): void {
  res.status(statusCode).json({
    error: {
      message,
      code
    }
  });
}

// ============================================================================
// Plan Endpoints
// ============================================================================

/**
 * POST /api/plans/search
 * Search plans using hybrid keyword + semantic search
 */
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('POST /api/plans/search', { body: req.body as unknown });

  // Validate request body
  const parseResult = searchSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR');
    return;
  }

  const params = parseResult.data as PlanSearchParams;

  try {
    // Handle ID-based lookup
    if (params.id) {
      const plan = readPlan(params.id);
      if (!plan) {
        const response: PlanSearchResponse = {
          results: [],
          guidance: `Plan ${params.id} not found`
        };
        res.json(response);
        return;
      }

      const response: PlanSearchResponse = {
        results: [plan]
      };
      res.json(response);
      return;
    }

    // Read all plans
    const plans = readAllPlans();

    // Perform search
    const results = await searchPlans(
      params.query ?? '',
      plans,
      params.limit ?? 1,
      params.include_all_statuses ?? false
    );

    const response: PlanSearchResponse = {
      results: params.summary_only
        ? results.map(p => ({
            id: p.id,
            summary: p.summary,
            goal: p.goal,
            status: p.status,
            created_at: p.created_at,
            updated_at: p.updated_at,
            score: p.score,
            match_reason: p.match_reason
          }))
        : results
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Plan search failed:', errorMessage);
    sendError(res, 500, 'Search failed', 'SEARCH_ERROR');
  }
}));

/**
 * POST /api/plans/store
 * Store new or update existing plan
 */
router.post('/store', asyncHandler((req: Request, res: Response) => {
  logger.debug('POST /api/plans/store', { body: req.body as unknown });

  // Validate request body
  const parseResult = storeSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR');
    return Promise.resolve();
  }

  const params = parseResult.data as PlanStoreParams;

  try {
    const now = Date.now();
    const exists = planExists(params.id);

    const plan: Plan = {
      id: params.id,
      status: 'planning' as PlanStatus,
      summary: params.summary,
      goal: params.goal,
      decisions: params.decisions,
      implementation_plan: params.implementation_plan,
      tasks: params.tasks,
      notes: '',
      created_at: exists ? (readPlan(params.id)?.created_at ?? now) : now,
      updated_at: now
    };

    savePlan(plan);

    logger.info(`✅ ${exists ? 'Updated' : 'Created'} plan ${params.id}`);

    const response: PlanStoreResponse = {
      success: true,
      plan
    };

    res.status(exists ? 200 : 201).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Plan store failed:', errorMessage);

    const response: PlanStoreResponse = {
      success: false,
      error: errorMessage
    };

    res.status(500).json(response);
  }

  return Promise.resolve();
}));

/**
 * POST /api/plans/update
 * Update existing plan (tasks, notes, status)
 */
router.post('/update', asyncHandler((req: Request, res: Response) => {
  logger.debug('POST /api/plans/update', { body: req.body as unknown });

  // Validate request body
  const parseResult = updateSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR');
    return Promise.resolve();
  }

  const params = parseResult.data as PlanUpdateParams;

  try {
    // Read existing plan
    const existingPlan = readPlan(params.id);
    if (!existingPlan) {
      const response: PlanUpdateResponse = {
        success: false,
        error: `Plan ${params.id} not found`
      };
      res.status(404).json(response);
      return Promise.resolve();
    }

    // Apply updates
    const updatedTasks = [...existingPlan.tasks];

    // Update existing tasks
    if (params.task_updates) {
      for (const update of params.task_updates) {
        if (update.index >= 0 && update.index < updatedTasks.length) {
          updatedTasks[update.index] = {
            ...updatedTasks[update.index],
            status: update.status
          } as Task;
        }
      }
    }

    // Add new tasks
    if (params.new_tasks) {
      for (const newTask of params.new_tasks) {
        updatedTasks.push({
          summary: newTask.summary,
          details: newTask.details,
          status: (newTask.status ?? 'pending') as TaskStatus
        });
      }
    }

    // Update notes
    let updatedNotes = existingPlan.notes;
    if (params.add_note) {
      const timestamp = new Date().toISOString();
      const noteEntry = `[${timestamp}] ${params.add_note}`;
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\n${noteEntry}`
        : noteEntry;
    }

    // Update plan
    const updatedPlan: Plan = {
      ...existingPlan,
      tasks: updatedTasks,
      notes: updatedNotes,
      status: params.plan_status ?? existingPlan.status,
      updated_at: Date.now()
    };

    savePlan(updatedPlan);

    logger.info(`✅ Updated plan ${params.id}`);

    const response: PlanUpdateResponse = {
      success: true,
      plan: updatedPlan
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Plan update failed:', errorMessage);

    const response: PlanUpdateResponse = {
      success: false,
      error: errorMessage
    };

    res.status(500).json(response);
  }

  return Promise.resolve();
}));

/**
 * GET /api/plans/list
 * List all plans (for autocomplete, recent items, etc.)
 */
router.get('/list', asyncHandler((_req: Request, res: Response) => {
  logger.debug('GET /api/plans/list');

  try {
    const plans = readAllPlans();

    // Sort by updated_at descending (most recent first)
    const sorted = [...plans].sort((a, b) => b.updated_at - a.updated_at);

    res.json(sorted);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Plan list failed:', errorMessage);
    sendError(res, 500, 'List failed', 'LIST_ERROR');
  }

  return Promise.resolve();
}));

/**
 * GET /api/plans/:id
 * Get single plan by ID
 */
router.get('/:id', asyncHandler((req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`GET /api/plans/${id}`);

  try {
    const plan = readPlan(id);

    if (!plan) {
      sendError(res, 404, `Plan ${id} not found`, 'NOT_FOUND');
      return Promise.resolve();
    }

    res.json(plan);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Plan get failed for ${id}:`, errorMessage);
    sendError(res, 500, 'Get failed', 'GET_ERROR');
  }

  return Promise.resolve();
}));

/**
 * DELETE /api/plans/:id
 * Delete a plan by ID
 */
router.delete('/:id', asyncHandler((req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`DELETE /api/plans/${id}`);

  try {
    const deleted = deletePlan(id);

    if (!deleted) {
      sendError(res, 404, `Plan ${id} not found`, 'NOT_FOUND');
      return Promise.resolve();
    }

    logger.info(`✅ Deleted plan ${id}`);
    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Plan delete failed for ${id}:`, errorMessage);
    sendError(res, 500, 'Delete failed', 'DELETE_ERROR');
  }

  return Promise.resolve();
}));

export { router as plansRouter };
