/**
 * System information service
 * Provides access to environment and system-level information
 */

import apiClient from './api.service.js';
import type { SystemInfoResponse } from '../../shared/types/system.js';

/**
 * Fetch system information (home directory, platform, cwd)
 */
export async function fetchSystemInfo(): Promise<SystemInfoResponse> {
  const response = await apiClient.get<SystemInfoResponse>('/system/info');
  return response.data;
}
