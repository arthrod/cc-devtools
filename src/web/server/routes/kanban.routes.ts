/**
 * Kanban API routes
 * RESTful endpoints for kanban board operations
 */

import { Router } from 'express';
import { z } from 'zod';

import * as logger from '../utils/logger.js';

import {
  filterStories,
  groupByStatus
} from '../../../kanban/services/query.js';
import { getAllReviewsForStory } from '../../../kanban/services/review-storage.js';
import { searchKanban } from '../../../kanban/services/search.js';
import {
  readAllStories,
  readStory,
  saveStory,
  deleteStory,
  readConfig,
  generateNextStoryId,
  parseId
} from '../../../kanban/services/storage.js';
import {
  validateStoryMove,
  validateSubtaskMove
} from '../../../kanban/services/validation.js';

import type {
  Story,
  Subtask,
  StoryStatus,
  SubtaskStatus,
  BusinessValue,
  Phase,
  FilterCriteria,
  SearchOptions
} from '../../../kanban/types.js';
import type { CaughtError } from '../../shared/types.js';
import type { Request, Response } from 'express';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createStorySchema = z.object({
  title: z.string().min(1),
  phase: z.string().min(1),
  description: z.string().optional(),
  details: z.string().optional(),
  business_value: z.enum(['XS', 'S', 'M', 'L', 'XL']).optional(),
  effort_estimation_hours: z.number().positive().optional(),
  labels: z.array(z.string()).optional(),
  planning_notes: z.string().optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  relevant_documentation: z.array(z.string()).optional(),
  dependent_upon: z.array(z.string()).optional()
});

const updateStorySchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  phase: z.string().min(1).optional(),
  description: z.string().optional(),
  details: z.string().optional(),
  business_value: z.enum(['XS', 'S', 'M', 'L', 'XL']).optional(),
  effort_estimation_hours: z.number().positive().optional(),
  labels: z.array(z.string()).optional(),
  planning_notes: z.string().optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  relevant_documentation: z.array(z.string()).optional(),
  dependent_upon: z.array(z.string()).optional(),
  implementation_notes: z.string().optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'in_review', 'done'])
});

const updateSubtaskStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done'])
});

const createSubtaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  details: z.string().optional(),
  effort_estimation_hours: z.number().positive().optional(),
  planning_notes: z.string().optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  relevant_documentation: z.array(z.string()).optional(),
  dependent_upon: z.array(z.string()).optional()
});

const updateSubtaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  description: z.string().optional(),
  details: z.string().optional(),
  effort_estimation_hours: z.number().positive().optional(),
  planning_notes: z.string().optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  relevant_documentation: z.array(z.string()).optional(),
  dependent_upon: z.array(z.string()).optional(),
  implementation_notes: z.string().optional()
});

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
  similarityThreshold: z.number().min(0).max(1).optional(),
  scope: z.enum(['stories', 'subtasks', 'both']).optional(),
  status: z.string().optional(),
  storyId: z.string().optional()
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
function sendError(res: Response, statusCode: number, message: string, code: string, details?: unknown): void {
  res.status(statusCode).json({
    error: {
      message,
      code,
      ...(details ? { details } : {})
    }
  });
}

// ============================================================================
// Story Endpoints
// ============================================================================

/**
 * GET /api/kanban/stories
 * List all stories with optional filters
 */
router.get('/stories', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('GET /api/kanban/stories', { query: req.query });

  const stories = await readAllStories();

  // Apply filters if provided
  const criteria: FilterCriteria = {};

  if (req.query.status) {
    criteria.status = req.query.status as StoryStatus;
  }

  if (req.query.phase) {
    criteria.phase = req.query.phase as Phase;
  }

  if (req.query.label) {
    criteria.label = req.query.label as string;
  }

  if (req.query.value) {
    criteria.value = req.query.value as BusinessValue;
  }

  if (req.query.hasSubtasks !== undefined) {
    criteria.hasSubtasks = req.query.hasSubtasks === 'true';
  }

  if (req.query.ready !== undefined) {
    criteria.ready = req.query.ready === 'true';
  }

  const filtered = Object.keys(criteria).length > 0
    ? filterStories(stories, criteria)
    : stories;

  // Optionally group by status
  if (req.query.groupBy === 'status') {
    const grouped = groupByStatus(filtered);
    res.json(grouped);
  } else {
    res.json(filtered);
  }
}));

/**
 * GET /api/kanban/stories/:id
 * Get single story by ID
 */
router.get('/stories/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`GET /api/kanban/stories/${id}`);

  const story = await readStory(id);

  if (!story) {
    sendError(res, 404, `Story ${id} not found`, 'NOT_FOUND');
    return;
  }

  res.json(story);
}));

/**
 * GET /api/kanban/stories/:id/reviews
 * Get all reviews for a story
 */
router.get('/stories/:id/reviews', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`GET /api/kanban/stories/${id}/reviews`);

  const story = await readStory(id);

  if (!story) {
    sendError(res, 404, `Story ${id} not found`, 'NOT_FOUND');
    return;
  }

  const reviews = await getAllReviewsForStory(id);

  logger.debug(`Found ${reviews.length} reviews for story ${id}`);

  res.json(reviews);
}));

/**
 * POST /api/kanban/stories
 * Create new story
 */
router.post('/stories', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('POST /api/kanban/stories', { body: req.body as unknown });

  // Validate request body
  const parseResult = createStorySchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', parseResult.error.errors);
    return;
  }

  const data = parseResult.data;

  // Generate story ID
  const storyId = await generateNextStoryId(data.phase);

  // Create story object
  const config = await readConfig();
  const newStory: Story = {
    id: storyId,
    title: data.title,
    status: config.default_status.story,
    phase: data.phase,
    description: data.description,
    details: data.details,
    business_value: data.business_value,
    effort_estimation_hours: data.effort_estimation_hours,
    labels: data.labels,
    planning_notes: data.planning_notes,
    acceptance_criteria: data.acceptance_criteria,
    relevant_documentation: data.relevant_documentation,
    dependent_upon: data.dependent_upon,
    implementation_notes: null,
    updated_at: new Date().toISOString()
  };

  // Save story
  await saveStory(newStory);

  logger.info(`✅ Created story ${storyId}`);

  res.status(201).json(newStory);
}));

/**
 * PUT /api/kanban/stories/:id
 * Update story
 */
router.put('/stories/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`PUT /api/kanban/stories/${id}`, { body: req.body as unknown });

  // Validate request body
  const parseResult = updateStorySchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', parseResult.error.errors);
    return;
  }

  const data = parseResult.data;

  // Get existing story
  const existingStory = await readStory(id);
  if (!existingStory) {
    sendError(res, 404, `Story ${id} not found`, 'NOT_FOUND');
    return;
  }

  // If status is being changed, validate the move
  if (data.status && data.status !== existingStory.status) {
    const allStories = await readAllStories();
    const validation = await validateStoryMove(id, data.status, allStories);

    if (!validation.valid) {
      sendError(res, 400, validation.error ?? 'Invalid status transition', 'VALIDATION_ERROR', {
        blockingStories: validation.blockingStories,
        incompleteSubtasks: validation.incompleteSubtasks,
        blockingDependencies: validation.blockingDependencies
      });
      return;
    }
  }

  // Merge updates
  const updatedStory: Story = {
    ...existingStory,
    ...data,
    updated_at: new Date().toISOString()
  };

  // If status changed to 'done', set completion timestamp
  if (data.status === 'done' && existingStory.status !== 'done') {
    updatedStory.completion_timestamp = new Date().toISOString();
  }

  await saveStory(updatedStory);

  logger.info(`✅ Updated story ${id}`);

  res.json(updatedStory);
}));

/**
 * PATCH /api/kanban/stories/:id/status
 * Update story status only
 */
router.patch('/stories/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`PATCH /api/kanban/stories/${id}/status`, { body: req.body as unknown });

  // Validate request body
  const parseResult = updateStatusSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', parseResult.error.errors);
    return;
  }

  const { status } = parseResult.data;

  // Get existing story
  const existingStory = await readStory(id);
  if (!existingStory) {
    sendError(res, 404, `Story ${id} not found`, 'NOT_FOUND');
    return;
  }

  // Validate status move
  const allStories = await readAllStories();
  const validation = await validateStoryMove(id, status, allStories);

  if (!validation.valid) {
    sendError(res, 400, validation.error ?? 'Invalid status transition', 'VALIDATION_ERROR', {
      blockingStories: validation.blockingStories,
      incompleteSubtasks: validation.incompleteSubtasks,
      blockingDependencies: validation.blockingDependencies
    });
    return;
  }

  // Update status
  const updatedStory: Story = {
    ...existingStory,
    status,
    updated_at: new Date().toISOString()
  };

  // If status changed to 'done', set completion timestamp
  if (status === 'done' && existingStory.status !== 'done') {
    updatedStory.completion_timestamp = new Date().toISOString();
  }

  await saveStory(updatedStory);

  logger.info(`✅ Updated story ${id} status to ${status}`);

  res.json(updatedStory);
}));

/**
 * DELETE /api/kanban/stories/:id
 * Delete story
 */
router.delete('/stories/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`DELETE /api/kanban/stories/${id}`);

  const deletedStory = await deleteStory(id);

  if (!deletedStory) {
    sendError(res, 404, `Story ${id} not found`, 'NOT_FOUND');
    return;
  }

  logger.info(`✅ Deleted story ${id}`);

  res.json({ success: true, story: deletedStory });
}));

// ============================================================================
// Subtask Endpoints
// ============================================================================

/**
 * GET /api/kanban/stories/:storyId/subtasks
 * List subtasks for a story
 */
router.get('/stories/:storyId/subtasks', asyncHandler(async (req: Request, res: Response) => {
  const { storyId } = req.params;
  logger.debug(`GET /api/kanban/stories/${storyId}/subtasks`);

  const story = await readStory(storyId);

  if (!story) {
    sendError(res, 404, `Story ${storyId} not found`, 'NOT_FOUND');
    return;
  }

  res.json(story.subtasks ?? []);
}));

/**
 * GET /api/kanban/subtasks/:id
 * Get single subtask by ID
 */
router.get('/subtasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`GET /api/kanban/subtasks/${id}`);

  // Parse subtask ID to get story ID
  try {
    const parsed = parseId(id);

    if (parsed.type !== 'subtask') {
      sendError(res, 400, `Invalid subtask ID: ${id}`, 'INVALID_INPUT');
      return;
    }

    const story = await readStory(parsed.storyId);

    if (!story) {
      sendError(res, 404, `Parent story ${parsed.storyId} not found`, 'NOT_FOUND');
      return;
    }

    const subtask = story.subtasks?.find(st => st.id === id);

    if (!subtask) {
      sendError(res, 404, `Subtask ${id} not found`, 'NOT_FOUND');
      return;
    }

    res.json(subtask);
  } catch (error) {
    const err = error as CaughtError;
    if (err.code === 'INVALID_INPUT') {
      sendError(res, 400, err.message ?? 'Invalid subtask ID', 'INVALID_INPUT');
      return;
    }
    throw error;
  }
}));

/**
 * POST /api/kanban/stories/:storyId/subtasks
 * Create new subtask
 */
router.post('/stories/:storyId/subtasks', asyncHandler(async (req: Request, res: Response) => {
  const { storyId } = req.params;
  logger.debug(`POST /api/kanban/stories/${storyId}/subtasks`, { body: req.body as unknown });

  // Validate request body
  const parseResult = createSubtaskSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', parseResult.error.errors);
    return;
  }

  const data = parseResult.data;

  // Get parent story
  const story = await readStory(storyId);
  if (!story) {
    sendError(res, 404, `Story ${storyId} not found`, 'NOT_FOUND');
    return;
  }

  // Generate subtask ID
  const subtasks = story.subtasks ?? [];
  const nextNum = subtasks.length + 1;
  const subtaskId = `${storyId}-${nextNum}`;

  // Create subtask object
  const config = await readConfig();
  const newSubtask: Subtask = {
    id: subtaskId,
    title: data.title,
    status: config.default_status.subtask,
    description: data.description,
    details: data.details,
    effort_estimation_hours: data.effort_estimation_hours,
    planning_notes: data.planning_notes,
    acceptance_criteria: data.acceptance_criteria,
    relevant_documentation: data.relevant_documentation,
    dependent_upon: data.dependent_upon,
    updated_at: new Date().toISOString()
  };

  // Add subtask to story
  const updatedStory: Story = {
    ...story,
    subtasks: [...subtasks, newSubtask],
    updated_at: new Date().toISOString()
  };

  await saveStory(updatedStory);

  logger.info(`✅ Created subtask ${subtaskId}`);

  res.status(201).json(newSubtask);
}));

/**
 * PUT /api/kanban/subtasks/:id
 * Update subtask
 */
router.put('/subtasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`PUT /api/kanban/subtasks/${id}`, { body: req.body as unknown });

  // Validate request body
  const parseResult = updateSubtaskSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', parseResult.error.errors);
    return;
  }

  const data = parseResult.data;

  // Parse subtask ID to get story ID
  let parsed;
  try {
    parsed = parseId(id);

    if (parsed.type !== 'subtask') {
      sendError(res, 400, `Invalid subtask ID: ${id}`, 'INVALID_INPUT');
      return;
    }
  } catch (error) {
    const err = error as CaughtError;
    sendError(res, 400, err.message ?? 'Invalid subtask ID', 'INVALID_INPUT');
    return;
  }

  // Get parent story
  const story = await readStory(parsed.storyId);
  if (!story) {
    sendError(res, 404, `Parent story ${parsed.storyId} not found`, 'NOT_FOUND');
    return;
  }

  // Find subtask
  const subtaskIndex = story.subtasks?.findIndex(st => st.id === id) ?? -1;
  if (subtaskIndex === -1) {
    sendError(res, 404, `Subtask ${id} not found`, 'NOT_FOUND');
    return;
  }

  const existingSubtask = (story.subtasks ?? [])[subtaskIndex];

  // If status is being changed, validate the move
  if (data.status && data.status !== existingSubtask.status) {
    const allStories = await readAllStories();
    const validation = await validateSubtaskMove(id, data.status, allStories);

    if (!validation.valid) {
      sendError(res, 400, validation.error ?? 'Invalid status transition', 'VALIDATION_ERROR', {
        blockingStories: validation.blockingStories,
        blockingDependencies: validation.blockingDependencies
      });
      return;
    }
  }

  // Merge updates
  const updatedSubtask: Subtask = {
    ...existingSubtask,
    ...data,
    updated_at: new Date().toISOString()
  };

  // If status changed to 'done', set completion timestamp
  if (data.status === 'done' && existingSubtask.status !== 'done') {
    updatedSubtask.completion_timestamp = new Date().toISOString();
  }

  // Update subtask in story
  const updatedSubtasks = [...(story.subtasks ?? [])];
  updatedSubtasks[subtaskIndex] = updatedSubtask;

  const updatedStory: Story = {
    ...story,
    subtasks: updatedSubtasks,
    updated_at: new Date().toISOString()
  };

  await saveStory(updatedStory);

  logger.info(`✅ Updated subtask ${id}`);

  res.json(updatedSubtask);
}));

/**
 * PATCH /api/kanban/subtasks/:id/status
 * Update subtask status only
 */
router.patch('/subtasks/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`PATCH /api/kanban/subtasks/${id}/status`, { body: req.body as unknown });

  // Validate request body
  const parseResult = updateSubtaskStatusSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', parseResult.error.errors);
    return;
  }

  const { status } = parseResult.data;

  // Parse subtask ID to get story ID
  let parsed;
  try {
    parsed = parseId(id);

    if (parsed.type !== 'subtask') {
      sendError(res, 400, `Invalid subtask ID: ${id}`, 'INVALID_INPUT');
      return;
    }
  } catch (error) {
    const err = error as CaughtError;
    sendError(res, 400, err.message ?? 'Invalid subtask ID', 'INVALID_INPUT');
    return;
  }

  // Get parent story
  const story = await readStory(parsed.storyId);
  if (!story) {
    sendError(res, 404, `Parent story ${parsed.storyId} not found`, 'NOT_FOUND');
    return;
  }

  // Find subtask
  const subtaskIndex = story.subtasks?.findIndex(st => st.id === id) ?? -1;
  if (subtaskIndex === -1) {
    sendError(res, 404, `Subtask ${id} not found`, 'NOT_FOUND');
    return;
  }

  const existingSubtask = (story.subtasks ?? [])[subtaskIndex];

  // Validate status move
  const allStories = await readAllStories();
  const validation = await validateSubtaskMove(id, status, allStories);

  if (!validation.valid) {
    sendError(res, 400, validation.error ?? 'Invalid status transition', 'VALIDATION_ERROR', {
      blockingStories: validation.blockingStories,
      blockingDependencies: validation.blockingDependencies
    });
    return;
  }

  // Update subtask status
  const updatedSubtask: Subtask = {
    ...existingSubtask,
    status,
    updated_at: new Date().toISOString()
  };

  // If status changed to 'done', set completion timestamp
  if (status === 'done' && existingSubtask.status !== 'done') {
    updatedSubtask.completion_timestamp = new Date().toISOString();
  }

  // Update subtask in story
  const updatedSubtasks = [...(story.subtasks ?? [])];
  updatedSubtasks[subtaskIndex] = updatedSubtask;

  const updatedStory: Story = {
    ...story,
    subtasks: updatedSubtasks,
    updated_at: new Date().toISOString()
  };

  await saveStory(updatedStory);

  logger.info(`✅ Updated subtask ${id} status to ${status}`);

  res.json(updatedSubtask);
}));

/**
 * DELETE /api/kanban/subtasks/:id
 * Delete subtask
 */
router.delete('/subtasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`DELETE /api/kanban/subtasks/${id}`);

  // Parse subtask ID to get story ID
  let parsed;
  try {
    parsed = parseId(id);

    if (parsed.type !== 'subtask') {
      sendError(res, 400, `Invalid subtask ID: ${id}`, 'INVALID_INPUT');
      return;
    }
  } catch (error) {
    const err = error as CaughtError;
    sendError(res, 400, err.message ?? 'Invalid subtask ID', 'INVALID_INPUT');
    return;
  }

  // Get parent story
  const story = await readStory(parsed.storyId);
  if (!story) {
    sendError(res, 404, `Parent story ${parsed.storyId} not found`, 'NOT_FOUND');
    return;
  }

  // Find and remove subtask
  const subtaskIndex = story.subtasks?.findIndex(st => st.id === id) ?? -1;
  if (subtaskIndex === -1) {
    sendError(res, 404, `Subtask ${id} not found`, 'NOT_FOUND');
    return;
  }

  const deletedSubtask = (story.subtasks ?? [])[subtaskIndex];

  const updatedSubtasks = [...(story.subtasks ?? [])];
  updatedSubtasks.splice(subtaskIndex, 1);

  const updatedStory: Story = {
    ...story,
    subtasks: updatedSubtasks,
    updated_at: new Date().toISOString()
  };

  await saveStory(updatedStory);

  logger.info(`✅ Deleted subtask ${id}`);

  res.json({ success: true, subtask: deletedSubtask });
}));

// ============================================================================
// Metadata Endpoints
// ============================================================================

/**
 * GET /api/kanban/tags
 * List all unique tags/labels
 */
router.get('/tags', asyncHandler(async (_req: Request, res: Response) => {
  logger.debug('GET /api/kanban/tags');

  const stories = await readAllStories();

  const tagsSet = new Set<string>();
  for (const story of stories) {
    if (story.labels) {
      for (const label of story.labels) {
        tagsSet.add(label);
      }
    }
  }

  const tags = Array.from(tagsSet).sort();

  res.json(tags);
}));

/**
 * GET /api/kanban/config
 * Get kanban configuration
 */
router.get('/config', asyncHandler(async (_req: Request, res: Response) => {
  logger.debug('GET /api/kanban/config');

  const config = await readConfig();

  res.json(config);
}));

/**
 * POST /api/kanban/search
 * Search stories and/or subtasks using hybrid semantic + keyword search
 */
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('POST /api/kanban/search', { body: req.body as unknown });

  // Validate request body
  const parseResult = searchSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', parseResult.error.errors);
    return;
  }

  const data = parseResult.data;

  // Prepare search options
  const searchOptions: SearchOptions = {
    query: data.query,
    limit: data.limit,
    similarityThreshold: data.similarityThreshold,
    scope: data.scope,
    status: data.status as StoryStatus | SubtaskStatus | undefined,
    storyId: data.storyId
  };

  try {
    // Get all stories
    const stories = await readAllStories();

    // Perform search
    const results = await searchKanban(stories, searchOptions);

    logger.debug(`Found ${results.length} search results for query: ${data.query}`);

    res.json(results);
  } catch (error) {
    const err = error as CaughtError;
    if (err.code === 'INVALID_INPUT') {
      sendError(res, 400, err.message ?? 'Invalid search query', 'INVALID_INPUT');
      return;
    }
    throw error;
  }
}));

export { router as kanbanRouter };
