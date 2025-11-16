import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import type { Memory, MemorySearchParams, MemorySearchResponse } from '../../../web/shared/types/memory.js';
import * as memoryService from '../services/memory.service.js';
import { useToast } from './useToast.js';

/**
 * React Query hook for fetching all memories (sorted by most recent)
 * @param params Optional search parameters. If omitted or query is empty, fetches all memories.
 */
export function useMemories(params?: { query: string; limit?: number }): UseQueryResult<Memory[], Error> {
  const query = params?.query ?? '';
  const limit = params?.limit ?? 200;

  return useQuery({
    queryKey: ['memories', { query, limit }],
    queryFn: async () => {
      if (!query.trim()) {
        return memoryService.fetchMemories();
      }
      const response = await memoryService.searchMemories({ query, limit });
      return response.results;
    },
    keepPreviousData: true,
    placeholderData: (prev) => prev,
  });
}

/**
 * React Query hook for searching memories with hybrid keyword + semantic search
 * @deprecated Use useMemories with params instead for better performance
 */
export function useSearchMemories(params: MemorySearchParams | null): UseQueryResult<MemorySearchResponse, Error> {
  return useQuery({
    queryKey: ['memories', 'search', params],
    queryFn: () => memoryService.searchMemories(params!),
    enabled: !!params && params.query.trim().length > 0,
  });
}

/**
 * React Query mutation hook for deleting a memory
 */
export function useDeleteMemory(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (memoryId: string) => memoryService.deleteMemory(memoryId),
    onMutate: async (memoryId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['memories'] });

      // Snapshot previous value
      const previousMemories = queryClient.getQueryData(['memories']);

      // Optimistically remove from cache
      queryClient.setQueryData(['memories'], (old: Memory[] | undefined) => {
        if (!old) return old;
        return old.filter((memory) => memory.id !== memoryId);
      });

      return { previousMemories };
    },
    onSuccess: () => {
      showToast('Memory deleted successfully', 'success');
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousMemories) {
        queryClient.setQueryData(['memories'], context.previousMemories);
      }
      showToast(`Failed to delete memory: ${error.message}`, 'error');
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      void queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}
