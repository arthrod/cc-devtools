/**
 * React Query hook for fetching system information
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SystemInfo } from '../../shared/types/system.js';
import * as systemService from '../services/system.service.js';

/**
 * Hook to fetch system information (home directory, platform, cwd)
 * Cached indefinitely since this data doesn't change during a session
 */
export function useSystemInfo(): UseQueryResult<SystemInfo, Error> {
  return useQuery({
    queryKey: ['system', 'info'],
    queryFn: async () => {
      const response = await systemService.fetchSystemInfo();
      return response.info;
    },
    staleTime: Infinity, // Never refetch - this data doesn't change
    gcTime: Infinity, // Keep in cache forever
  });
}
