import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { gitService } from '../services/git.service';
import type { GitStatusResponse, GitFileStatusResponse } from '../../shared/types/git';

/**
 * React Query hook for fetching full repository git status
 */
export function useGitStatus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['git', 'status'],
    queryFn: () => gitService.getStatus(),
    staleTime: 5000, // Cache for 5 seconds (matches backend cache)
    refetchOnWindowFocus: true,
  });

  // Note: SSE for real-time updates is handled by the global useSSE hook in App.tsx
  // It listens for 'file_changed' events and could invalidate git status if needed
  // Currently git status is refetched on window focus and uses cache for efficiency

  return query;
}

/**
 * React Query hook for fetching git status of a specific file
 */
export function useFileGitStatus(filePath: string | null) {
  return useQuery({
    queryKey: ['git', 'file-status', filePath],
    queryFn: () => gitService.getFileStatus(filePath ?? ''),
    enabled: Boolean(filePath),
    staleTime: 5000,
  });
}

/**
 * Get git status for a specific file from the cached full status
 * More efficient than fetching individual file status when full status is already loaded
 */
export function useFileGitStatusFromCache(filePath: string | null) {
  const { data: fullStatus } = useGitStatus();

  if (!filePath || !fullStatus) {
    return null;
  }

  // Find the file in the cached full status
  const fileStatus = fullStatus.files.find(f => f.path === filePath);

  return fileStatus ?? null;
}

/**
 * Helper hook to get git status map (path -> status) for quick lookups
 */
export function useGitStatusMap() {
  const { data: fullStatus, ...query } = useGitStatus();

  const statusMap = new Map<string, GitFileStatusResponse['file']>();

  fullStatus?.files.forEach((file) => {
    statusMap.set(file.path, file);
  });

  return {
    statusMap,
    branch: fullStatus?.branch ?? null,
    hasChanges: fullStatus?.hasChanges ?? false,
    isGitRepo: fullStatus?.isGitRepo ?? false,
    ...query,
  };
}
