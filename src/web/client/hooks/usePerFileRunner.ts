import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type {
  PerFileRunnerConfig,
  ConfigStatusDetailed,
  ConfigStatusSummary,
  AutomaticModeStatus,
} from '../../../web/shared/types/per-file-runner.js';
import * as perFileRunnerService from '../services/per-file-runner.service.js';
import { useToast } from './useToast.js';

/**
 * React Query hook for fetching all configs
 */
export function useConfigs(): UseQueryResult<PerFileRunnerConfig[], Error> {
  return useQuery({
    queryKey: ['per-file-runner', 'configs'],
    queryFn: () => perFileRunnerService.fetchConfigs(),
  });
}

/**
 * React Query hook for fetching a single config
 */
export function useConfig(id: string): UseQueryResult<PerFileRunnerConfig, Error> {
  return useQuery({
    queryKey: ['per-file-runner', 'config', id],
    queryFn: () => perFileRunnerService.fetchConfig(id),
    enabled: !!id,
  });
}

/**
 * React Query hook for fetching config status
 */
export function useConfigStatus(id: string): UseQueryResult<ConfigStatusDetailed, Error> {
  return useQuery({
    queryKey: ['per-file-runner', 'status', id],
    queryFn: () => perFileRunnerService.fetchConfigStatus(id),
    enabled: !!id,
    refetchInterval: false,
  });
}

/**
 * React Query hook for fetching all config statuses
 */
export function useAllStatuses(): UseQueryResult<ConfigStatusSummary[], Error> {
  return useQuery({
    queryKey: ['per-file-runner', 'statuses'],
    queryFn: () => perFileRunnerService.fetchAllStatuses(),
    refetchInterval: false,
  });
}

/**
 * React Query hook for automatic mode status
 */
export function useAutomaticStatus(): UseQueryResult<AutomaticModeStatus, Error> {
  return useQuery({
    queryKey: ['per-file-runner', 'automatic', 'status'],
    queryFn: () => perFileRunnerService.getAutomaticStatus(),
    // No polling needed - we'll use SSE for real-time updates
    refetchInterval: false,
  });
}

/**
 * React Query mutation hook for creating a config
 */
export function useCreateConfig(): UseMutationResult<void, Error, PerFileRunnerConfig> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (config: PerFileRunnerConfig) => perFileRunnerService.createConfig(config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'configs'] });
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'statuses'] });
      showToast('Config created successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to create config: ${error.message}`, 'error');
    },
  });
}

/**
 * React Query mutation hook for updating a config
 */
export function useUpdateConfig(): UseMutationResult<
  void,
  Error,
  { id: string; updates: Partial<PerFileRunnerConfig> }
> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }) => perFileRunnerService.updateConfig(id, updates),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'configs'] });
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'config', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'statuses'] });
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'status', variables.id] });
      showToast('Config updated successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to update config: ${error.message}`, 'error');
    },
  });
}

/**
 * React Query mutation hook for deleting a config
 */
export function useDeleteConfig(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => perFileRunnerService.deleteConfig(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['per-file-runner'] });

      const previousConfigs = queryClient.getQueryData(['per-file-runner', 'configs']);

      queryClient.setQueryData(['per-file-runner', 'configs'], (old: PerFileRunnerConfig[] | undefined) => {
        if (!old) return old;
        return old.filter((config) => config.id !== id);
      });

      return { previousConfigs };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'configs'] });
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'statuses'] });
      showToast('Config deleted successfully', 'success');
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousConfigs) {
        queryClient.setQueryData(['per-file-runner', 'configs'], context.previousConfigs);
      }
      showToast(`Failed to delete config: ${error.message}`, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner'] });
    },
  });
}

/**
 * React Query mutation hook for resetting config state
 */
export function useResetConfig(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => perFileRunnerService.resetConfig(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'status', id] });
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'statuses'] });
      showToast('Config state reset successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to reset config: ${error.message}`, 'error');
    },
  });
}

/**
 * React Query mutation hook for resetting single file state
 */
export function useResetFile(): UseMutationResult<void, Error, { id: string; file: string }> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, file }) => perFileRunnerService.resetFile(id, file),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'status', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'statuses'] });
      showToast('File state reset successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to reset file: ${error.message}`, 'error');
    },
  });
}

/**
 * React Query mutation hook for starting automatic mode
 */
export function useStartAutomatic(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => perFileRunnerService.startAutomatic(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'automatic', 'status'] });
      showToast('Automatic mode started', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to start automatic mode: ${error.message}`, 'error');
    },
  });
}

/**
 * React Query mutation hook for stopping automatic mode
 */
export function useStopAutomatic(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => perFileRunnerService.stopAutomatic(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['per-file-runner', 'automatic', 'status'] });
      // Don't show toast - the UI state already shows "Stopping..."
    },
    onError: (error: Error) => {
      showToast(`Failed to stop automatic mode: ${error.message}`, 'error');
    },
  });
}

/**
 * React Query hook for previewing files matching glob patterns
 */
export function usePreviewFiles(
  include: string[],
  exclude: string[],
  enabled: boolean = true
): UseQueryResult<{ files: string[]; count: number }, Error> {
  return useQuery({
    queryKey: ['per-file-runner', 'preview-files', include, exclude],
    queryFn: () => perFileRunnerService.previewFiles(include, exclude),
    enabled: enabled && include.length > 0,
    staleTime: 5000, // Cache for 5 seconds
  });
}
