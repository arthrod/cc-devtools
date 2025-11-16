import type {
  Plan,
  PlanSearchParams,
  PlanSearchResponse,
  PlanStoreParams,
  PlanStoreResponse,
  PlanUpdateParams,
  PlanUpdateResponse
} from '../../../web/shared/types/plans.js';
import api from './api.service.js';

/**
 * API service for plan operations
 */

/**
 * Search plans using hybrid keyword + semantic search
 */
export const searchPlans = async (params: PlanSearchParams): Promise<PlanSearchResponse> => {
  const response = await api.post<PlanSearchResponse>('/plans/search', params);
  return response.data;
};

/**
 * Fetch all plans (sorted by most recent first)
 */
export const fetchAllPlans = async (): Promise<Plan[]> => {
  const response = await api.get<Plan[]>('/plans/list');
  return response.data;
};

/**
 * Get single plan by ID
 */
export const fetchPlanById = async (id: string): Promise<Plan> => {
  const response = await api.get<Plan>(`/plans/${id}`);
  return response.data;
};

/**
 * Store new or update existing plan
 */
export const storePlan = async (params: PlanStoreParams): Promise<PlanStoreResponse> => {
  const response = await api.post<PlanStoreResponse>('/plans/store', params);
  return response.data;
};

/**
 * Update existing plan (tasks, notes, status)
 */
export const updatePlan = async (params: PlanUpdateParams): Promise<PlanUpdateResponse> => {
  const response = await api.post<PlanUpdateResponse>('/plans/update', params);
  return response.data;
};
