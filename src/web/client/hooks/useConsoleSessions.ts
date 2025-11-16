import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConsoleSession, CreateSessionRequest } from '../../shared/types/console.js';
import {
  fetchSessions,
  createSession,
  destroySession,
  updateSessionName,
} from '../services/console.service.js';

/**
 * Query key for console sessions list
 */
const CONSOLE_SESSIONS_KEY = ['console', 'sessions'] as const;

/**
 * React Query hook for fetching console sessions
 */
export function useConsoleSessions() {
  return useQuery({
    queryKey: CONSOLE_SESSIONS_KEY,
    queryFn: fetchSessions,
    staleTime: 5000,
  });
}

/**
 * React Query hook for creating a new console session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: CreateSessionRequest) => createSession(options),
    onSuccess: () => {
      // Invalidate sessions list to trigger refetch
      void queryClient.invalidateQueries({ queryKey: CONSOLE_SESSIONS_KEY });
    },
  });
}

/**
 * React Query hook for destroying a console session
 */
export function useDestroySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => destroySession(sessionId),
    onSuccess: () => {
      // Invalidate sessions list to trigger refetch
      void queryClient.invalidateQueries({ queryKey: CONSOLE_SESSIONS_KEY });
    },
  });
}

/**
 * React Query hook for updating a session's custom name
 */
export function useUpdateSessionName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, name }: { sessionId: string; name: string }) =>
      updateSessionName(sessionId, name),
    onSuccess: () => {
      // Invalidate sessions list to trigger refetch
      void queryClient.invalidateQueries({ queryKey: CONSOLE_SESSIONS_KEY });
    },
  });
}
