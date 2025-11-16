import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import type { Story, Subtask, StoryStatus, SubtaskStatus, KanbanSearchResult } from '../../../kanban/types.js';
import * as kanbanService from '../services/kanban.service.js';
import type {
  KanbanStoryFilters,
  CreateStoryData,
  UpdateStoryData,
  CreateSubtaskData,
  UpdateSubtaskData,
  KanbanConfig,
  KanbanSearchOptions,
} from '../services/kanban.service.js';
import { useToast } from './useToast.js';

/**
 * React Query hook for fetching ALL stories (no search filtering - that's done on frontend)
 * @param filters Optional filters to apply to stories (phase, status, etc - NOT search)
 */
export function useStories(filters?: KanbanStoryFilters): UseQueryResult<Story[], Error> {
  return useQuery({
    queryKey: ['kanban', 'stories', filters],
    queryFn: () => kanbanService.fetchStories(filters),
    placeholderData: (prev) => prev,
  });
}

/**
 * React Query hook for fetching a single story by ID
 */
export function useStory(storyId: string | null): UseQueryResult<Story, Error> {
  return useQuery({
    queryKey: ['kanban', 'stories', storyId],
    queryFn: () => kanbanService.fetchStory(storyId!),
    enabled: !!storyId,
  });
}

/**
 * React Query hook for fetching kanban configuration
 */
export function useKanbanConfig(): UseQueryResult<KanbanConfig, Error> {
  return useQuery({
    queryKey: ['kanban', 'config'],
    queryFn: () => kanbanService.fetchConfig(),
  });
}

/**
 * React Query hook for fetching all tags
 */
export function useTags(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: ['kanban', 'tags'],
    queryFn: () => kanbanService.fetchTags(),
  });
}

/**
 * React Query hook for semantic search of kanban stories/subtasks.
 * Returns matching IDs for frontend filtering.
 */
export function useSearchKanban(
  searchQuery: string
): UseQueryResult<KanbanSearchResult[], Error> {
  return useQuery({
    queryKey: ['kanban', 'search', searchQuery],
    queryFn: () => kanbanService.searchKanban({
      query: searchQuery,
      limit: 100,
      scope: 'stories'
    }),
    enabled: searchQuery.trim().length > 0,
    placeholderData: (prev) => prev,
  });
}

/**
 * Mutations interface for kanban operations
 */
export interface KanbanMutations {
  createStory: UseMutationResult<Story, Error, CreateStoryData>;
  updateStory: UseMutationResult<Story, Error, { storyId: string; data: UpdateStoryData }>;
  updateStoryStatus: UseMutationResult<Story, Error, { storyId: string; status: StoryStatus }>;
  deleteStory: UseMutationResult<void, Error, string>;
  createSubtask: UseMutationResult<Subtask, Error, { storyId: string; data: CreateSubtaskData }>;
  updateSubtask: UseMutationResult<Subtask, Error, { subtaskId: string; data: UpdateSubtaskData }>;
  updateSubtaskStatus: UseMutationResult<Subtask, Error, { subtaskId: string; status: SubtaskStatus }>;
  deleteSubtask: UseMutationResult<void, Error, string>;
}

/**
 * React Query hook providing all kanban mutation operations with optimistic updates
 */
export function useKanbanMutations(): KanbanMutations {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Create story
  const createStory = useMutation({
    mutationFn: (data: CreateStoryData) => kanbanService.createStory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'tags'] });
      showToast('Story created successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to create story: ${error.message}`, 'error');
    },
  });

  // Update story
  const updateStory = useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: UpdateStoryData }) =>
      kanbanService.updateStory(storyId, data),
    onMutate: async ({ storyId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['kanban', 'stories'] });

      // Snapshot previous value
      const previousStories = queryClient.getQueryData(['kanban', 'stories']);

      // Optimistically update cache
      queryClient.setQueryData(['kanban', 'stories'], (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((story) =>
          story.id === storyId ? { ...story, ...data } : story
        );
      });

      return { previousStories };
    },
    onSuccess: () => {
      showToast('Story updated successfully', 'success');
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousStories) {
        queryClient.setQueryData(['kanban', 'stories'], context.previousStories);
      }
      showToast(`Failed to update story: ${error.message}`, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'tags'] });
    },
  });

  // Update story status
  const updateStoryStatus = useMutation({
    mutationFn: ({ storyId, status }: { storyId: string; status: StoryStatus }) =>
      kanbanService.updateStoryStatus(storyId, status),
    onMutate: async ({ storyId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban', 'stories'] });

      const previousStories = queryClient.getQueryData(['kanban', 'stories']);

      queryClient.setQueryData(['kanban', 'stories'], (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((story) =>
          story.id === storyId ? { ...story, status } : story
        );
      });

      return { previousStories };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['kanban', 'stories'], context.previousStories);
      }
      showToast(`Failed to update story status: ${error.message}`, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
    },
  });

  // Delete story
  const deleteStory = useMutation({
    mutationFn: (storyId: string) => kanbanService.deleteStory(storyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'tags'] });
      showToast('Story deleted successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to delete story: ${error.message}`, 'error');
    },
  });

  // Create subtask
  const createSubtask = useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: CreateSubtaskData }) =>
      kanbanService.createSubtask(storyId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
      showToast('Subtask created successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to create subtask: ${error.message}`, 'error');
    },
  });

  // Update subtask
  const updateSubtask = useMutation({
    mutationFn: ({ subtaskId, data }: { subtaskId: string; data: UpdateSubtaskData }) =>
      kanbanService.updateSubtask(subtaskId, data),
    onMutate: async ({ subtaskId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban', 'stories'] });

      const previousStories = queryClient.getQueryData(['kanban', 'stories']);

      // Update subtask within nested story structure
      queryClient.setQueryData(['kanban', 'stories'], (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((story) => ({
          ...story,
          subtasks: story.subtasks?.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, ...data } : subtask
          ),
        }));
      });

      return { previousStories };
    },
    onSuccess: () => {
      showToast('Subtask updated successfully', 'success');
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['kanban', 'stories'], context.previousStories);
      }
      showToast(`Failed to update subtask: ${error.message}`, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
    },
  });

  // Update subtask status
  const updateSubtaskStatus = useMutation({
    mutationFn: ({ subtaskId, status }: { subtaskId: string; status: SubtaskStatus }) =>
      kanbanService.updateSubtaskStatus(subtaskId, status),
    onMutate: async ({ subtaskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban', 'stories'] });

      const previousStories = queryClient.getQueryData(['kanban', 'stories']);

      queryClient.setQueryData(['kanban', 'stories'], (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((story) => ({
          ...story,
          subtasks: story.subtasks?.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, status } : subtask
          ),
        }));
      });

      return { previousStories };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['kanban', 'stories'], context.previousStories);
      }
      showToast(`Failed to update subtask status: ${error.message}`, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
    },
  });

  // Delete subtask
  const deleteSubtask = useMutation({
    mutationFn: (subtaskId: string) => kanbanService.deleteSubtask(subtaskId),
    onMutate: async (subtaskId: string) => {
      await queryClient.cancelQueries({ queryKey: ['kanban', 'stories'] });

      const previousStories = queryClient.getQueryData(['kanban', 'stories']);

      // Remove subtask from all stories
      queryClient.setQueryData(['kanban', 'stories'], (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((story) => ({
          ...story,
          subtasks: story.subtasks?.filter((subtask) => subtask.id !== subtaskId),
        }));
      });

      return { previousStories };
    },
    onSuccess: () => {
      showToast('Subtask deleted successfully', 'success');
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['kanban', 'stories'], context.previousStories);
      }
      showToast(`Failed to delete subtask: ${error.message}`, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
    },
  });

  return {
    createStory,
    updateStory,
    updateStoryStatus,
    deleteStory,
    createSubtask,
    updateSubtask,
    updateSubtaskStatus,
    deleteSubtask,
  };
}

/**
 * Individual mutation hooks for convenience
 */
export function useCreateStory(): UseMutationResult<Story, Error, CreateStoryData> {
  const { createStory } = useKanbanMutations();
  return createStory;
}

export function useUpdateStory(): UseMutationResult<Story, Error, { id: string; updates: UpdateStoryData }> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateStoryData }) =>
      kanbanService.updateStory(id, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'tags'] });
      showToast('Story updated successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to update story: ${error.message}`, 'error');
    },
  });
}

export function useDeleteStory(): UseMutationResult<void, Error, string> {
  const { deleteStory } = useKanbanMutations();
  return deleteStory;
}

export function useCreateSubtask(): UseMutationResult<Subtask, Error, { storyId: string; title: string; description?: string }> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ storyId, title, description }: { storyId: string; title: string; description?: string }) =>
      kanbanService.createSubtask(storyId, { title, description }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
      showToast('Subtask created successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to create subtask: ${error.message}`, 'error');
    },
  });
}

export function useUpdateSubtask(): UseMutationResult<Subtask, Error, { storyId: string; subtaskId: string; updates: UpdateSubtaskData }> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ subtaskId, updates }: { storyId: string; subtaskId: string; updates: UpdateSubtaskData }) =>
      kanbanService.updateSubtask(subtaskId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kanban', 'stories'] });
      showToast('Subtask updated successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to update subtask: ${error.message}`, 'error');
    },
  });
}

export function useDeleteSubtask(): UseMutationResult<void, Error, string> {
  const { deleteSubtask } = useKanbanMutations();
  return deleteSubtask;
}
