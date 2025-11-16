/**
 * Per-File-Runner API routes
 * RESTful endpoints for managing per-file-runner configs and execution
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import * as logger from '../utils/logger.js';

import { loadConfig, saveConfig, validateConfig, getConfigById } from '../../../per-file-runner/core/config.js';
import { findMatchingFiles } from '../../../per-file-runner/core/file-matcher.js';
import { getStateForConfig, resetConfigState, resetFileState } from '../../../per-file-runner/core/state.js';
import { runConfig, updateCurrentFiles, getFilesToProcess } from '../../../per-file-runner/services/runner.js';

import type {
  PerFileRunnerConfig,
  ConfigStatusSummary,
  ConfigStatusDetailed,
  ConfigListResponse,
  ConfigResponse,
  StatusResponse,
  AllStatusesResponse,
  DeleteConfigResponse,
  ResetResponse,
  CreateConfigRequest,
  UpdateConfigRequest,
  ResetFileRequest,
  PreviewFilesRequest,
  AutomaticModeResponse,
  SSEEvent,
} from '../../shared/types/per-file-runner.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createConfigSchema = z.object({
  config: z.object({
    id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'ID must contain only lowercase letters, numbers, and hyphens'),
    name: z.string().min(1),
    priority: z.number().int().min(1),
    prompt: z.string().min(1).refine(s => s.includes('{filename}'), 'Prompt must contain {filename} placeholder'),
    command: z.string().min(1),
    args: z.array(z.string()).refine(arr => arr.some(s => s.includes('___PROMPT___')), 'Args must contain ___PROMPT___ placeholder'),
    timeout: z.number().int().min(1000),
    glob: z.object({
      include: z.array(z.string()).min(1),
      exclude: z.array(z.string()).optional(),
    }),
  }),
});

const updateConfigSchema = z.object({
  config: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    priority: z.number().int().min(1).optional(),
    prompt: z.string().min(1).optional(),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    timeout: z.number().int().min(1000).optional(),
    glob: z.object({
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
    }).optional(),
  }),
});

const resetFileSchema = z.object({
  file: z.string().min(1),
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
      code,
    },
  });
}

/**
 * Calculate status summary for a config
 */
async function calculateStatusSummary(
  config: PerFileRunnerConfig,
  cwd: string
): Promise<ConfigStatusSummary> {
  const state = await getStateForConfig(config.id, cwd);
  const files = state.currentFiles;

  const filesNew = files.filter(f => f.last_state === 'new').length;
  const filesOutOfDate = files.filter(f => f.last_state === 'out-of-date').length;
  const filesUpToDate = files.filter(f => f.last_state === 'up-to-date').length;

  return {
    configId: config.id,
    configName: config.name,
    priority: config.priority,
    totalFiles: files.length,
    filesNew,
    filesOutOfDate,
    filesUpToDate,
    isRunning: runningConfigs.has(config.id),
  };
}

/**
 * Calculate detailed status for a config
 */
async function calculateStatusDetailed(
  config: PerFileRunnerConfig,
  cwd: string
): Promise<ConfigStatusDetailed> {
  const state = await getStateForConfig(config.id, cwd);

  return {
    configId: config.id,
    configName: config.name,
    priority: config.priority,
    files: state.currentFiles,
    isRunning: runningConfigs.has(config.id),
  };
}

/**
 * Send SSE event to client
 */
function sendSSEEvent(res: Response, event: SSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Broadcast SSE event to all automatic mode clients
 */
function broadcastAutomaticModeEvent(event: SSEEvent): void {
  const deadClients: Response[] = [];

  automaticMode.sseClients.forEach((client) => {
    try {
      sendSSEEvent(client, event);
    } catch {
      deadClients.push(client);
    }
  });

  // Clean up dead clients
  deadClients.forEach((client) => {
    automaticMode.sseClients.delete(client);
  });
}

// ============================================================================
// Running State Management
// ============================================================================

// Track which configs are currently running with abort controllers
const runningConfigs = new Map<string, AbortController>();

// Track automatic mode state
interface AutomaticModeState {
  running: boolean;
  intervalId?: NodeJS.Timeout;
  lastRunAt?: number;
  nextRunAt?: number;
  lastRunResult?: {
    success: boolean;
    filesProcessed: number;
    error?: string;
  };
  currentRun?: {
    configId: string;
    configName: string;
    progress: number;
    total: number;
  };
  overallProgress?: {
    filesProcessed: number;
    totalFiles: number;
  };
  sseClients: Set<Response>;
}

const automaticMode: AutomaticModeState = {
  running: false,
  sseClients: new Set(),
};

// ============================================================================
// Config CRUD Endpoints
// ============================================================================

/**
 * GET /api/per-file-runner/configs
 * List all configs
 */
router.get('/configs', asyncHandler(async (_req: Request, res: Response) => {
  logger.debug('GET /api/per-file-runner/configs');

  const cwd = process.cwd();
  const configs = await loadConfig(cwd);

  // Sort by priority
  configs.sort((a, b) => a.priority - b.priority);

  const response: ConfigListResponse = {
    configs,
  };

  res.json(response);
}));

/**
 * GET /api/per-file-runner/configs/:id
 * Get single config
 */
router.get('/configs/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`GET /api/per-file-runner/configs/${id}`);

  const cwd = process.cwd();
  const config = await getConfigById(id, cwd);

  if (!config) {
    sendError(res, 404, `Config not found: ${id}`, 'NOT_FOUND');
    return;
  }

  const response: ConfigResponse = {
    config,
  };

  res.json(response);
}));

/**
 * POST /api/per-file-runner/configs
 * Create new config
 */
router.post('/configs', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('POST /api/per-file-runner/configs', { body: req.body as unknown });

  // Validate request body
  const parseResult = createConfigSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed: ' + parseResult.error.message, 'VALIDATION_ERROR');
    return;
  }

  const { config } = parseResult.data as CreateConfigRequest;
  const cwd = process.cwd();

  // Check if config with this ID already exists
  const existing = await getConfigById(config.id, cwd);
  if (existing) {
    sendError(res, 409, `Config with ID ${config.id} already exists`, 'DUPLICATE_ID');
    return;
  }

  // Load existing configs and add new one
  const configs = await loadConfig(cwd);
  configs.push(config);
  await saveConfig(configs, cwd);

  const response: ConfigResponse = {
    config,
  };

  res.status(201).json(response);
}));

/**
 * PUT /api/per-file-runner/configs/:id
 * Update existing config
 */
router.put('/configs/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`PUT /api/per-file-runner/configs/${id}`, { body: req.body as unknown });

  // Validate request body
  const parseResult = updateConfigSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed: ' + parseResult.error.message, 'VALIDATION_ERROR');
    return;
  }

  const { config: updates } = parseResult.data as UpdateConfigRequest;
  const cwd = process.cwd();

  // Load existing configs
  const configs = await loadConfig(cwd);
  const index = configs.findIndex(c => c.id === id);

  if (index === -1) {
    sendError(res, 404, `Config not found: ${id}`, 'NOT_FOUND');
    return;
  }

  // Update config
  const updatedConfig = {
    ...configs[index],
    ...updates,
    id: configs[index].id, // Prevent ID changes
  };

  // Validate updated config
  if (!validateConfig(updatedConfig)) {
    sendError(res, 400, 'Invalid config structure after update', 'VALIDATION_ERROR');
    return;
  }

  configs[index] = updatedConfig;
  await saveConfig(configs, cwd);

  const response: ConfigResponse = {
    config: updatedConfig,
  };

  res.json(response);
}));

/**
 * DELETE /api/per-file-runner/configs/:id
 * Delete config
 */
router.delete('/configs/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`DELETE /api/per-file-runner/configs/${id}`);

  const cwd = process.cwd();

  // Load existing configs
  const configs = await loadConfig(cwd);
  const index = configs.findIndex(c => c.id === id);

  if (index === -1) {
    sendError(res, 404, `Config not found: ${id}`, 'NOT_FOUND');
    return;
  }

  // Remove config
  configs.splice(index, 1);
  await saveConfig(configs, cwd);

  const response: DeleteConfigResponse = {
    success: true,
  };

  res.json(response);
}));

// ============================================================================
// Status Endpoints
// ============================================================================

/**
 * GET /api/per-file-runner/status/:id
 * Get detailed status for a config
 */
router.get('/status/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`GET /api/per-file-runner/status/${id}`);

  const cwd = process.cwd();
  const config = await getConfigById(id, cwd);

  if (!config) {
    sendError(res, 404, `Config not found: ${id}`, 'NOT_FOUND');
    return;
  }

  // Update file states before returning status
  await updateCurrentFiles(config, cwd);

  const status = await calculateStatusDetailed(config, cwd);

  const response: StatusResponse = {
    status,
  };

  res.json(response);
}));

/**
 * GET /api/per-file-runner/status
 * Get status summary for all configs
 */
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  logger.debug('GET /api/per-file-runner/status');

  const cwd = process.cwd();
  const configs = await loadConfig(cwd);

  // Update file states for all configs
  await Promise.all(configs.map(config => updateCurrentFiles(config, cwd)));

  // Calculate status summaries
  const statuses = await Promise.all(
    configs.map(config => calculateStatusSummary(config, cwd))
  );

  // Sort by priority
  statuses.sort((a, b) => a.priority - b.priority);

  const response: AllStatusesResponse = {
    statuses,
  };

  res.json(response);
}));

// ============================================================================
// Execution Endpoints
// ============================================================================

/**
 * GET /api/per-file-runner/run/:id
 * Run a config with SSE streaming
 * Query params: dryRun (boolean)
 */
router.get('/run/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const dryRun = req.query.dryRun === 'true';
  logger.debug(`GET /api/per-file-runner/run/${id}`, { dryRun });
  const cwd = process.cwd();

  // Check if config exists
  const config = await getConfigById(id, cwd);
  if (!config) {
    sendError(res, 404, `Config not found: ${id}`, 'NOT_FOUND');
    return;
  }

  // Check if already running
  if (runningConfigs.has(id)) {
    sendError(res, 409, `Config ${id} is already running`, 'ALREADY_RUNNING');
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.flushHeaders();

  // Create abort controller for cancellation
  const abortController = new AbortController();
  runningConfigs.set(id, abortController);

  // Handle client disconnect
  req.on('close', () => {
    logger.debug(`Client disconnected from run stream for ${id}`);
    abortController.abort();
    runningConfigs.delete(id);
  });

  try {
    // Update file states
    const currentFiles = await updateCurrentFiles(config, cwd);
    const filesToProcess = getFilesToProcess(currentFiles);

    // Send run-start event
    sendSSEEvent(res, {
      type: 'run-start',
      data: {
        configId: config.id,
        configName: config.name,
        totalFiles: filesToProcess.length,
      },
    });

    // If no files to process, complete immediately
    if (filesToProcess.length === 0) {
      sendSSEEvent(res, {
        type: 'run-complete',
        data: {
          filesProcessed: 0,
          filesSucceeded: 0,
          filesFailed: 0,
        },
      });
      res.end();
      runningConfigs.delete(id);
      return;
    }

    // Run config with progress callbacks
    let fileIndex = 0;
    const result = await runConfig(config, dryRun, cwd, {
      signal: abortController.signal,
      onProgress: {
        onFileStart: (file: string) => {
          fileIndex++;
          sendSSEEvent(res, {
            type: 'file-start',
            data: { file, index: fileIndex, total: filesToProcess.length },
          });
        },
        onFileSuccess: (file: string, duration: number, output?: string) => {
          sendSSEEvent(res, {
            type: 'file-success',
            data: { file, duration, output },
          });
        },
        onFileError: (file: string, error: string, output?: string) => {
          sendSSEEvent(res, {
            type: 'file-error',
            data: { file, error, output },
          });
        },
      },
    });

    // Send run-complete event
    sendSSEEvent(res, {
      type: 'run-complete',
      data: {
        filesProcessed: result.filesProcessed,
        filesSucceeded: result.filesSucceeded,
        filesFailed: result.filesFailed,
      },
    });

    res.end();
  } catch (error) {
    logger.error(`Error running config ${id}:`, error);
    sendSSEEvent(res, {
      type: 'run-error',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    res.end();
  } finally {
    runningConfigs.delete(id);
  }
}));

/**
 * GET /api/per-file-runner/run-all
 * Run all configs in priority order with SSE streaming
 * Query params: dryRun (boolean)
 */
router.get('/run-all', asyncHandler(async (req: Request, res: Response) => {
  const dryRun = req.query.dryRun === 'true';
  logger.debug('GET /api/per-file-runner/run-all', { dryRun });
  const cwd = process.cwd();

  // Load and sort configs by priority
  const configs = await loadConfig(cwd);
  configs.sort((a, b) => a.priority - b.priority);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.flushHeaders();

  try {
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    // Run each config
    for (const config of configs) {
      if (runningConfigs.has(config.id)) {
        continue; // Skip if already running
      }

      const abortController = new AbortController();
      runningConfigs.set(config.id, abortController);

      try {
        const currentFiles = await updateCurrentFiles(config, cwd);
        const filesToProcess = getFilesToProcess(currentFiles);

        sendSSEEvent(res, {
          type: 'run-start',
          data: {
            configId: config.id,
            configName: config.name,
            totalFiles: filesToProcess.length,
          },
        });

        if (filesToProcess.length > 0) {
          const result = await runConfig(config, dryRun, cwd, {
            signal: abortController.signal,
          });

          totalProcessed += result.filesProcessed;
          totalSucceeded += result.filesSucceeded;
          totalFailed += result.filesFailed;

          sendSSEEvent(res, {
            type: 'run-complete',
            data: {
              filesProcessed: result.filesProcessed,
              filesSucceeded: result.filesSucceeded,
              filesFailed: result.filesFailed,
            },
          });
        } else {
          sendSSEEvent(res, {
            type: 'run-complete',
            data: {
              filesProcessed: 0,
              filesSucceeded: 0,
              filesFailed: 0,
            },
          });
        }
      } finally {
        runningConfigs.delete(config.id);
      }
    }

    // Send final summary
    sendSSEEvent(res, {
      type: 'run-complete',
      data: {
        filesProcessed: totalProcessed,
        filesSucceeded: totalSucceeded,
        filesFailed: totalFailed,
      },
    });

    res.end();
  } catch (error) {
    logger.error('Error running all configs:', error);
    sendSSEEvent(res, {
      type: 'run-error',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    res.end();
  }
}));

// ============================================================================
// Reset Endpoints
// ============================================================================

/**
 * POST /api/per-file-runner/reset/:id
 * Reset all file states for a config
 */
router.post('/reset/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`POST /api/per-file-runner/reset/${id}`);

  const cwd = process.cwd();

  // Check if config exists
  const config = await getConfigById(id, cwd);
  if (!config) {
    sendError(res, 404, `Config not found: ${id}`, 'NOT_FOUND');
    return;
  }

  await resetConfigState(id, cwd);

  const response: ResetResponse = {
    success: true,
  };

  res.json(response);
}));

/**
 * POST /api/per-file-runner/reset-file/:id
 * Reset state for a single file
 */
router.post('/reset-file/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.debug(`POST /api/per-file-runner/reset-file/${id}`, { body: req.body as unknown });

  // Validate request body
  const parseResult = resetFileSchema.safeParse(req.body as unknown);
  if (!parseResult.success) {
    sendError(res, 400, 'Validation failed: ' + parseResult.error.message, 'VALIDATION_ERROR');
    return;
  }

  const { file } = parseResult.data as ResetFileRequest;
  const cwd = process.cwd();

  // Check if config exists
  const config = await getConfigById(id, cwd);
  if (!config) {
    sendError(res, 404, `Config not found: ${id}`, 'NOT_FOUND');
    return;
  }

  await resetFileState(id, file, cwd);

  const response: ResetResponse = {
    success: true,
  };

  res.json(response);
}));

// ============================================================================
// Automatic Mode Endpoints
// ============================================================================

/**
 * GET /api/per-file-runner/automatic/status
 * Get automatic mode status
 */
router.get('/automatic/status', asyncHandler(async (_req: Request, res: Response) => {
  logger.debug('GET /api/per-file-runner/automatic/status');

  // Calculate overall progress from all configs
  let overallProgress = automaticMode.overallProgress;

  // If not actively running, calculate progress from current state of all configs
  if (!overallProgress) {
    const cwd = process.cwd();
    const configs = await loadConfig(cwd);

    let totalFiles = 0;
    let filesNeedingProcessing = 0;

    for (const config of configs) {
      const currentFiles = await updateCurrentFiles(config, cwd);
      const filesToProcess = getFilesToProcess(currentFiles);

      totalFiles += currentFiles.length;
      filesNeedingProcessing += filesToProcess.length;
    }

    if (totalFiles > 0) {
      overallProgress = {
        filesProcessed: totalFiles - filesNeedingProcessing,
        totalFiles,
      };
    }
  }

  const response: AutomaticModeResponse = {
    status: {
      running: automaticMode.running,
      nextRunAt: automaticMode.nextRunAt,
      lastRunAt: automaticMode.lastRunAt,
      lastRunResult: automaticMode.lastRunResult,
      currentRun: automaticMode.currentRun,
      overallProgress,
      runningConfigs: Array.from(runningConfigs.keys()),
    },
  };

  res.json(response);
}));

/**
 * GET /api/per-file-runner/automatic/stream
 * SSE endpoint for automatic mode progress updates
 */
router.get('/automatic/stream', (_req: Request, res: Response) => {
  logger.debug('GET /api/per-file-runner/automatic/stream');

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.flushHeaders();

  // Add client to broadcast list
  automaticMode.sseClients.add(res);
  logger.debug(`Automatic mode SSE client connected (${automaticMode.sseClients.size} total)`);

  // Send initial status
  sendSSEEvent(res, {
    type: 'run-start',
    data: {
      configId: 'automatic',
      configName: 'Automatic Mode',
      totalFiles: automaticMode.overallProgress?.totalFiles ?? 0,
    },
  });

  // Handle client disconnect
  _req.on('close', () => {
    automaticMode.sseClients.delete(res);
    logger.debug(`Automatic mode SSE client disconnected (${automaticMode.sseClients.size} remaining)`);
  });
});

/**
 * POST /api/per-file-runner/automatic/start
 * Start automatic mode (run all configs every 60 seconds)
 */
router.post('/automatic/start', (_req: Request, res: Response) => {
  logger.debug('POST /api/per-file-runner/automatic/start');

  if (automaticMode.running) {
    sendError(res, 409, 'Automatic mode is already running', 'ALREADY_RUNNING');
    return;
  }

  automaticMode.running = true;

  // Run immediately and then every 60 seconds
  const runAutomatic = async (): Promise<void> => {
    if (!automaticMode.running) {
      return;
    }

    const cwd = process.cwd();
    const configs = await loadConfig(cwd);
    configs.sort((a, b) => a.priority - b.priority);

    // Calculate total files across all configs
    let totalFiles = 0;
    let filesNeedingProcessing = 0;
    const configFileCounts = new Map<string, number>();

    for (const config of configs) {
      const currentFiles = await updateCurrentFiles(config, cwd);
      const filesToProcess = getFilesToProcess(currentFiles);
      configFileCounts.set(config.id, filesToProcess.length);
      totalFiles += currentFiles.length;
      filesNeedingProcessing += filesToProcess.length;
    }

    // Initialize overall progress (preserve completed file count)
    automaticMode.overallProgress = {
      filesProcessed: totalFiles - filesNeedingProcessing,
      totalFiles,
    };

    // Broadcast run-start to all SSE clients
    broadcastAutomaticModeEvent({
      type: 'run-start',
      data: {
        configId: 'automatic',
        configName: 'Automatic Mode',
        totalFiles,
      },
    });

    let hasError = false;
    let errorMessage: string | undefined;

    for (const config of configs) {
      if (runningConfigs.has(config.id)) {
        continue;
      }

      const abortController = new AbortController();
      runningConfigs.set(config.id, abortController);

      try {
        const filesToProcess = configFileCounts.get(config.id) ?? 0;

        // Set current run progress
        automaticMode.currentRun = {
          configId: config.id,
          configName: config.name,
          progress: 0,
          total: filesToProcess,
        };

        const result = await runConfig(config, false, cwd, {
          signal: abortController.signal,
          onProgress: {
            onFileStart: (file: string) => {
              // Broadcast file-start event to all SSE clients (don't increment progress yet)
              broadcastAutomaticModeEvent({
                type: 'file-start',
                data: {
                  file,
                  index: automaticMode.overallProgress?.filesProcessed ?? 0,
                  total: automaticMode.overallProgress?.totalFiles ?? 0,
                },
              });
            },
            onFileSuccess: (file: string, duration: number, output?: string) => {
              // Increment progress on success
              if (automaticMode.currentRun) {
                automaticMode.currentRun.progress++;
              }
              if (automaticMode.overallProgress) {
                automaticMode.overallProgress.filesProcessed++;
              }
              // Broadcast file-success event to all SSE clients
              broadcastAutomaticModeEvent({
                type: 'file-success',
                data: { file, duration, output },
              });
            },
            onFileError: (file: string, error: string, output?: string) => {
              // Increment progress on error (file was processed, just failed)
              if (automaticMode.currentRun) {
                automaticMode.currentRun.progress++;
              }
              if (automaticMode.overallProgress) {
                automaticMode.overallProgress.filesProcessed++;
              }
              // Broadcast file-error event to all SSE clients
              broadcastAutomaticModeEvent({
                type: 'file-error',
                data: { file, error, output },
              });
            },
          },
        });

        if (result.filesFailed > 0) {
          hasError = true;
          errorMessage = result.error;
        }
      } catch (error) {
        hasError = true;
        errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in automatic mode for config ${config.id}:`, error);
      } finally {
        runningConfigs.delete(config.id);
      }
    }

    // Broadcast run-complete to all SSE clients
    broadcastAutomaticModeEvent({
      type: 'run-complete',
      data: {
        filesProcessed: totalFiles,
        filesSucceeded: totalFiles - (hasError ? 1 : 0),
        filesFailed: hasError ? 1 : 0,
      },
    });

    // Clear current run and overall progress, update last run status
    automaticMode.currentRun = undefined;
    automaticMode.overallProgress = undefined;
    automaticMode.lastRunAt = Date.now();
    automaticMode.lastRunResult = {
      success: !hasError,
      filesProcessed: totalFiles,
      error: errorMessage,
    };
  };

  // Run immediately
  void runAutomatic();

  // Schedule future runs and set nextRunAt
  automaticMode.nextRunAt = Date.now() + 60000;
  automaticMode.intervalId = setInterval(() => {
    automaticMode.nextRunAt = Date.now() + 60000;
    void runAutomatic();
  }, 60000); // 60 seconds

  const response: AutomaticModeResponse = {
    status: {
      running: true,
      nextRunAt: automaticMode.nextRunAt,
      runningConfigs: Array.from(runningConfigs.keys()),
    },
  };

  res.json(response);
});

/**
 * POST /api/per-file-runner/automatic/stop
 * Stop automatic mode
 */
router.post('/automatic/stop', (_req: Request, res: Response) => {
  logger.debug('POST /api/per-file-runner/automatic/stop');

  if (!automaticMode.running) {
    sendError(res, 409, 'Automatic mode is not running', 'NOT_RUNNING');
    return;
  }

  automaticMode.running = false;

  if (automaticMode.intervalId) {
    clearInterval(automaticMode.intervalId);
    automaticMode.intervalId = undefined;
  }

  // Abort all currently running configs (will finish current file then stop)
  runningConfigs.forEach((abortController) => {
    abortController.abort();
  });

  // Clear nextRunAt since we won't schedule more runs
  automaticMode.nextRunAt = undefined;

  // Note: We keep currentRun and overallProgress to show stopping state
  // These will be cleared when runAutomatic completes

  const response: AutomaticModeResponse = {
    status: {
      running: false,
      currentRun: automaticMode.currentRun,
      overallProgress: automaticMode.overallProgress,
      lastRunAt: automaticMode.lastRunAt,
      lastRunResult: automaticMode.lastRunResult,
      runningConfigs: [],
    },
  };

  res.json(response);
});

/**
 * POST /api/per-file-runner/preview-files
 * Preview files that would match given glob patterns
 */
router.post('/preview-files', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('POST /api/per-file-runner/preview-files');

  const { include, exclude } = req.body as PreviewFilesRequest;

  if (!include || !Array.isArray(include) || include.length === 0) {
    res.status(400).json({ success: false, error: 'Include patterns required' });
    return;
  }

  try {
    const files = await findMatchingFiles(
      {
        include,
        exclude: exclude ?? [],
      },
      process.cwd()
    );

    logger.debug(`Preview matched ${files.length} files`);

    res.json({
      success: true,
      data: {
        files,
        count: files.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Preview files failed:', errorMessage);
    res.status(500).json({ success: false, error: 'Failed to preview files' });
  }
}));

// ============================================================================
// Export Router
// ============================================================================

export { router as perFileRunnerRouter };
