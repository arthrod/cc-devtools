/**
 * Memory API routes
 * RESTful endpoints for memory search and storage
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import * as logger from '../utils/logger.js';

import { readMemories, saveMemories } from '../../../memory/core/storage.js';
import { searchMemories } from '../../../memory/services/search.js';

import type { Memory } from '../../../memory/types.js';
import type {
  MemorySearchParams,
  MemorySearchResponse,
  MemoryStoreParams,
  MemoryStoreResponse
} from '../../shared/types/memory.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const searchSchema = z.object({
  query: z.string(),
  limit: z.number().int().positive().optional()
});

const storeSchema = z.object({
  summary: z.string().min(1),
  details: z.string(),
  tags: z.array(z.string()).optional()
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
// Memory Endpoints
// ============================================================================

/**
 * POST /api/memory/search
 * Search memories using hybrid keyword + semantic search
 */
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('POST /api/memory/search', { body: req.body as unknown });

  // Validate request body
  const parseResult = searchSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR');
    return;
  }

  const params = parseResult.data as MemorySearchParams;

  try {
    // Read all memories
    const memories = readMemories();

    // Perform search
    const results = await searchMemories(
      params.query,
      memories,
      params.limit ?? 3
    );

    const response: MemorySearchResponse = {
      results
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Memory search failed:', errorMessage);
    sendError(res, 500, 'Search failed', 'SEARCH_ERROR');
  }
}));

/**
 * POST /api/memory/store
 * Store new memory
 */
router.post('/store', asyncHandler((req: Request, res: Response) => {
  logger.debug('POST /api/memory/store', { body: req.body as unknown });

  // Validate request body
  const parseResult = storeSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR');
    return Promise.resolve();
  }

  const params = parseResult.data as MemoryStoreParams;

  try {
    // Read existing memories
    const memories = readMemories();

    // Generate new ID
    const maxId = memories.reduce((max, m) => {
      const numericId = parseInt(m.id, 10);
      return isNaN(numericId) ? max : Math.max(max, numericId);
    }, 0);
    const newId = String(maxId + 1);

    // Create new memory
    const newMemory: Memory = {
      id: newId,
      summary: params.summary,
      details: params.details,
      tags: params.tags ?? [],
      created_at: Date.now()
    };

    // Add to memories and save
    const updatedMemories = [...memories, newMemory];
    saveMemories(updatedMemories);

    logger.info(`✅ Created memory ${newId}`);

    const response: MemoryStoreResponse = {
      success: true,
      memory: newMemory
    };

    res.status(201).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Memory store failed:', errorMessage);

    const response: MemoryStoreResponse = {
      success: false,
      error: errorMessage
    };

    res.status(500).json(response);
  }

  return Promise.resolve();
}));

/**
 * GET /api/memory/list
 * List all memories (for autocomplete, recent items, etc.)
 */
router.get('/list', asyncHandler((_req: Request, res: Response) => {
  logger.debug('GET /api/memory/list');

  try {
    const memories = readMemories();

    // Sort by created_at descending (most recent first)
    const sorted = [...memories].sort((a, b) => b.created_at - a.created_at);

    res.json(sorted);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Memory list failed:', errorMessage);
    sendError(res, 500, 'List failed', 'LIST_ERROR');
  }

  return Promise.resolve();
}));

export { router as memoryRouter };
