import type {
  PerFileRunnerConfig,
  ConfigStatusDetailed,
  ConfigStatusSummary,
  AutomaticModeStatus,
  ConfigListResponse,
  ConfigResponse,
  StatusResponse,
  AllStatusesResponse,
  AutomaticModeResponse,
  CreateConfigRequest,
  UpdateConfigRequest,
  ResetFileRequest,
  RunConfigRequest,
} from '../../../web/shared/types/per-file-runner.js';
import api from './api.service.js';

/**
 * API service for per-file-runner operations
 */

/**
 * Fetch all configs
 */
export const fetchConfigs = async (): Promise<PerFileRunnerConfig[]> => {
  const response = await api.get<ConfigListResponse>('/per-file-runner/configs');
  return response.data.configs;
};

/**
 * Fetch a single config by ID
 */
export const fetchConfig = async (id: string): Promise<PerFileRunnerConfig> => {
  const response = await api.get<ConfigResponse>(`/per-file-runner/configs/${id}`);
  return response.data.config;
};

/**
 * Create a new config
 */
export const createConfig = async (config: PerFileRunnerConfig): Promise<void> => {
  const request: CreateConfigRequest = { config };
  await api.post('/per-file-runner/configs', request);
};

/**
 * Update an existing config
 */
export const updateConfig = async (id: string, updates: Partial<PerFileRunnerConfig>): Promise<void> => {
  const request: UpdateConfigRequest = { config: updates };
  await api.put(`/per-file-runner/configs/${id}`, request);
};

/**
 * Delete a config by ID
 */
export const deleteConfig = async (id: string): Promise<void> => {
  await api.delete(`/per-file-runner/configs/${id}`);
};

/**
 * Fetch status for a single config
 */
export const fetchConfigStatus = async (id: string): Promise<ConfigStatusDetailed> => {
  const response = await api.get<StatusResponse>(`/per-file-runner/status/${id}`);
  return response.data.status;
};

/**
 * Fetch status summary for all configs
 */
export const fetchAllStatuses = async (): Promise<ConfigStatusSummary[]> => {
  const response = await api.get<AllStatusesResponse>('/per-file-runner/status');
  return response.data.statuses;
};

/**
 * Reset state for a config (marks all files as new)
 */
export const resetConfig = async (id: string): Promise<void> => {
  await api.post(`/per-file-runner/reset/${id}`);
};

/**
 * Reset state for a single file
 */
export const resetFile = async (id: string, file: string): Promise<void> => {
  const request: ResetFileRequest = { file };
  await api.post(`/per-file-runner/reset-file/${id}`, request);
};

/**
 * Get automatic mode status
 */
export const getAutomaticStatus = async (): Promise<AutomaticModeStatus> => {
  const response = await api.get<AutomaticModeResponse>('/per-file-runner/automatic/status');
  return response.data.status;
};

/**
 * Start automatic mode
 */
export const startAutomatic = async (): Promise<void> => {
  await api.post('/per-file-runner/automatic/start');
};

/**
 * Stop automatic mode
 */
export const stopAutomatic = async (): Promise<void> => {
  await api.post('/per-file-runner/automatic/stop');
};

/**
 * Create an SSE connection for automatic mode
 * Returns EventSource for streaming progress updates
 */
export const createAutomaticModeEventSource = (): EventSource => {
  const token = localStorage.getItem('cc-devtools-auth-token');
  const params = new URLSearchParams();
  if (token) {
    params.append('token', token);
  }

  const url = `/cc-api/per-file-runner/automatic/stream?${params.toString()}`;
  return new EventSource(url);
};

/**
 * Create an SSE connection for running a config
 * Returns EventSource for streaming progress updates
 */
export const createRunEventSource = (id: string, dryRun = false): EventSource => {
  const token = localStorage.getItem('cc-devtools-auth-token');
  const params = new URLSearchParams();
  if (token) {
    params.append('token', token);
  }
  if (dryRun) {
    params.append('dryRun', 'true');
  }

  const url = `/cc-api/per-file-runner/run/${id}?${params.toString()}`;
  return new EventSource(url);
};

/**
 * Create an SSE connection for running all configs
 * Returns EventSource for streaming progress updates
 */
export const createRunAllEventSource = (dryRun = false): EventSource => {
  const token = localStorage.getItem('cc-devtools-auth-token');
  const params = new URLSearchParams();
  if (token) {
    params.append('token', token);
  }
  if (dryRun) {
    params.append('dryRun', 'true');
  }

  const url = `/cc-api/per-file-runner/run-all?${params.toString()}`;
  return new EventSource(url);
};

/**
 * Preview files that would match given glob patterns
 */
export const previewFiles = async (
  include: string[],
  exclude: string[]
): Promise<{ files: string[]; count: number }> => {
  const response = await api.post<{ success: boolean; data: { files: string[]; count: number } }>(
    '/per-file-runner/preview-files',
    { include, exclude }
  );
  return response.data.data;
};
