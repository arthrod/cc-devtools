import type { Memory, MemorySearchParams, MemorySearchResponse } from '../../../web/shared/types/memory.js';
import api from './api.service.js';

/**
 * API service for memory operations
 */

/**
 * Fetch all memories (sorted by most recent)
 */
export const fetchMemories = async (): Promise<Memory[]> => {
  const response = await api.get<Memory[]>('/memory/list');
  return response.data;
};

/**
 * Search memories using hybrid keyword + semantic search
 */
export const searchMemories = async (params: MemorySearchParams): Promise<MemorySearchResponse> => {
  const response = await api.post<MemorySearchResponse>('/memory/search', params);
  return response.data;
};

/**
 * Delete a memory by ID
 */
export const deleteMemory = async (memoryId: string): Promise<void> => {
  await api.delete(`/memory/${memoryId}`);
};
