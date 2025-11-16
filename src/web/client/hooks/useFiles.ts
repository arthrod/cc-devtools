/**
 * React Query hooks for file operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFileTree, getFileContent, saveFileContent, type FileTreeNode, type FileContent, type SaveFileRequest } from '../services/files.service';
import { useToast } from './useToast';

/**
 * Hook to fetch file tree
 */
export function useFileTree(path: string = '.') {
  return useQuery<FileTreeNode, Error>({
    queryKey: ['fileTree', path],
    queryFn: () => getFileTree(path),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch file content
 */
export function useFileContent(path: string | null) {
  return useQuery<FileContent, Error>({
    queryKey: ['fileContent', path],
    queryFn: () => {
      if (!path) throw new Error('No file path provided');
      return getFileContent(path);
    },
    enabled: !!path,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1,
  });
}

/**
 * Hook to save file content
 */
export function useSaveFile() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, Error, SaveFileRequest>({
    mutationFn: saveFileContent,
    onSuccess: (_data, variables) => {
      // Invalidate the file content query to refetch
      queryClient.invalidateQueries({
        queryKey: ['fileContent', variables.path],
      });
      showToast('File saved successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to save file: ${error.message}`, 'error');
    },
  });
}
