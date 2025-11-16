import React from 'react';
import { Folder, Activity, Clock } from 'lucide-react';
import type { ConsoleSession } from '../../../shared/types/console.js';

interface SessionListProps {
  sessions: ConsoleSession[];
  onSelect: (session: ConsoleSession) => void;
}

/**
 * Displays a list of console sessions with metadata
 */
export function SessionList({ sessions, onSelect }: SessionListProps): JSX.Element {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Activity className="mx-auto h-12 w-12 mb-2 opacity-50" />
        <p>No existing sessions</p>
        <p className="text-sm mt-1">Create a new session to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session)}
          className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {session.customName ?? session.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    session.status === 'running'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : session.status === 'stopped'
                      ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {session.status}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Folder className="h-4 w-4" />
                  <span className="truncate">{session.currentDirectory}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimestamp(session.createdAt)}</span>
                {session.pid && <span className="ml-2">PID: {session.pid}</span>}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
