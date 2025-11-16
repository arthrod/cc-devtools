import type { GitStatusResponse, GitFileStatusResponse } from '../../shared/types/git';
import { getAuthToken } from './api.service';

const API_BASE = '/cc-api/git';

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const gitService = {
  /**
   * Get full repository status
   */
  async getStatus(): Promise<GitStatusResponse> {
    const response = await fetch(`${API_BASE}/status`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch git status: ${response.statusText}`);
    }

    const result = await response.json() as { success: boolean; data?: GitStatusResponse };

    if (!result.success || !result.data) {
      throw new Error('Invalid response format from git status API');
    }

    return result.data;
  },

  /**
   * Get git status for a specific file
   */
  async getFileStatus(path: string): Promise<GitFileStatusResponse> {
    const response = await fetch(`${API_BASE}/file-status?path=${encodeURIComponent(path)}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file status: ${response.statusText}`);
    }

    const result = await response.json() as { success: boolean; data?: GitFileStatusResponse };

    if (!result.success || !result.data) {
      throw new Error('Invalid response format from file status API');
    }

    return result.data;
  },

  /**
   * Clear git status cache (force refresh)
   */
  async clearCache(): Promise<void> {
    const response = await fetch(`${API_BASE}/clear-cache`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to clear git cache: ${response.statusText}`);
    }

    const result = await response.json() as { success: boolean };

    if (!result.success) {
      throw new Error('Failed to clear git cache');
    }
  },
};
