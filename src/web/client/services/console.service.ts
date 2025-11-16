import type {
  ConsoleSession,
  CreateSessionRequest,
  CreateSessionResponse,
  SessionListResponse,
  ConsoleSessionValidationResult,
  SessionCwdResponse,
} from '../../shared/types/console.js';
import api from './api.service.js';

/**
 * API service for console session operations
 */

/**
 * Fetch all console sessions for the authenticated user
 */
export async function fetchSessions(): Promise<ConsoleSession[]> {
  const response = await api.get<SessionListResponse>('/console/sessions');
  return response.data.sessions;
}

/**
 * Create a new console session
 */
export async function createSession(
  options?: CreateSessionRequest
): Promise<ConsoleSession> {
  const response = await api.post<CreateSessionResponse>('/console/sessions', options ?? {});
  return response.data.session;
}

/**
 * Get details for a specific session
 */
export async function getSession(sessionId: string): Promise<ConsoleSession> {
  const response = await api.get<ConsoleSessionValidationResult>(`/console/sessions/${sessionId}`);
  if (!response.data.valid || !response.data.session) {
    throw new Error('Session not found or invalid');
  }
  return response.data.session;
}

/**
 * Destroy a console session
 */
export async function destroySession(sessionId: string): Promise<void> {
  await api.delete(`/console/sessions/${sessionId}`);
}

/**
 * Get current working directory for a session
 */
export async function getSessionCwd(sessionId: string): Promise<string> {
  const response = await api.get<SessionCwdResponse>(`/console/sessions/${sessionId}/cwd`);
  return response.data.cwd;
}

/**
 * Update custom name for a session
 */
export async function updateSessionName(sessionId: string, name: string): Promise<void> {
  await api.patch(`/console/sessions/${sessionId}/name`, { name });
}
