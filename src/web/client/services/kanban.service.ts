import type { Story, Subtask, StoryStatus, SubtaskStatus, KanbanSearchResult, StoryReviewFeedback } from '../../../kanban/types.js';
import api from './api.service.js';

/**
 * API service for kanban operations
 */

export interface KanbanConfig {
  story: StoryStatus[];
  subtask: SubtaskStatus[];
  phases: string[];
  business_values: string[];
}

export interface KanbanStoryFilters {
  status?: StoryStatus;
  phase?: string;
  label?: string;
  businessValue?: string;
}

export interface CreateStoryData {
  title: string;
  description?: string;
  phase: string;
  business_value?: string;
  effort_estimation_hours?: number;
  labels?: string[];
  dependent_upon?: string[];
  acceptance_criteria?: string[];
  details?: string;
  planning_notes?: string;
  implementation_notes?: string | null;
  relevant_documentation?: string[];
}

export interface UpdateStoryData {
  title?: string;
  description?: string;
  status?: StoryStatus;
  // phase is intentionally omitted - it's immutable after creation (tied to story ID)
  business_value?: string;
  effort_estimation_hours?: number;
  labels?: string[];
  dependent_upon?: string[];
  acceptance_criteria?: string[];
  details?: string;
  planning_notes?: string;
  implementation_notes?: string | null;
  relevant_documentation?: string[];
}

export interface CreateSubtaskData {
  title: string;
  description?: string;
  effort_estimation_hours?: number;
}

export interface UpdateSubtaskData {
  title?: string;
  description?: string;
  status?: SubtaskStatus;
  effort_estimation_hours?: number;
}

export interface KanbanSearchOptions {
  query: string;
  limit?: number;
  similarityThreshold?: number;
  scope?: 'stories' | 'subtasks' | 'both';
  status?: StoryStatus | SubtaskStatus;
  storyId?: string;
}

// Story operations
export const fetchStories = async (filters?: KanbanStoryFilters): Promise<Story[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.phase) params.append('phase', filters.phase);
  if (filters?.label) params.append('label', filters.label);
  if (filters?.businessValue) params.append('businessValue', filters.businessValue);

  const queryString = params.toString();
  const url = `/kanban/stories${queryString ? `?${queryString}` : ''}`;

  const response = await api.get<Story[]>(url);
  return response.data;
};

export const fetchStory = async (storyId: string): Promise<Story> => {
  const response = await api.get<Story>(`/kanban/stories/${storyId}`);
  return response.data;
};

export const createStory = async (data: CreateStoryData): Promise<Story> => {
  const response = await api.post<Story>('/kanban/stories', data);
  return response.data;
};

export const updateStory = async (
  storyId: string,
  data: UpdateStoryData
): Promise<Story> => {
  const response = await api.put<Story>(`/kanban/stories/${storyId}`, data);
  return response.data;
};

export const updateStoryStatus = async (
  storyId: string,
  status: StoryStatus
): Promise<Story> => {
  const response = await api.patch<Story>(`/kanban/stories/${storyId}/status`, { status });
  return response.data;
};

export const deleteStory = async (storyId: string): Promise<void> => {
  await api.delete(`/kanban/stories/${storyId}`);
};

// Subtask operations
export const fetchSubtasks = async (storyId: string): Promise<Subtask[]> => {
  const response = await api.get<Subtask[]>(
    `/kanban/stories/${storyId}/subtasks`
  );
  return response.data;
};

export const fetchSubtask = async (subtaskId: string): Promise<Subtask> => {
  const response = await api.get<Subtask>(`/kanban/subtasks/${subtaskId}`);
  return response.data;
};

export const createSubtask = async (
  storyId: string,
  data: CreateSubtaskData
): Promise<Subtask> => {
  const response = await api.post<Subtask>(`/kanban/stories/${storyId}/subtasks`, data);
  return response.data;
};

export const updateSubtask = async (
  subtaskId: string,
  data: UpdateSubtaskData
): Promise<Subtask> => {
  const response = await api.put<Subtask>(`/kanban/subtasks/${subtaskId}`, data);
  return response.data;
};

export const updateSubtaskStatus = async (
  subtaskId: string,
  status: SubtaskStatus
): Promise<Subtask> => {
  const response = await api.patch<Subtask>(`/kanban/subtasks/${subtaskId}/status`, { status });
  return response.data;
};

export const deleteSubtask = async (subtaskId: string): Promise<void> => {
  await api.delete(`/kanban/subtasks/${subtaskId}`);
};

// Metadata operations
export const fetchTags = async (): Promise<string[]> => {
  const response = await api.get<string[]>('/kanban/tags');
  return response.data;
};

export const fetchConfig = async (): Promise<KanbanConfig> => {
  const response = await api.get<KanbanConfig>('/kanban/config');
  return response.data;
};

// Search operations
export const searchKanban = async (
  options: KanbanSearchOptions
): Promise<KanbanSearchResult[]> => {
  const response = await api.post<KanbanSearchResult[]>('/kanban/search', options);
  return response.data;
};

// Review operations
export const fetchStoryReviews = async (storyId: string): Promise<StoryReviewFeedback[]> => {
  const response = await api.get<StoryReviewFeedback[]>(`/kanban/stories/${storyId}/reviews`);
  return response.data;
};
