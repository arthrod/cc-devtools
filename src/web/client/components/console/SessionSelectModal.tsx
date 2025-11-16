import React, { useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { SessionList } from './SessionList.js';
import { useConsoleSessions, useCreateSession } from '../../hooks/useConsoleSessions.js';
import { useToast } from '../../hooks/useToast.js';
import type { ConsoleSession } from '../../../shared/types/console.js';

interface SessionSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionSelected: (session: ConsoleSession) => void;
}

/**
 * Modal for selecting existing console sessions or creating new ones
 */
export function SessionSelectModal({
  isOpen,
  onClose,
  onSessionSelected,
}: SessionSelectModalProps): JSX.Element {
  const { data: sessions, isLoading, error, refetch } = useConsoleSessions();
  const createSessionMutation = useCreateSession();
  const { showToast } = useToast();

  // Refetch sessions when modal opens
  useEffect(() => {
    if (isOpen) {
      void refetch();
    }
  }, [isOpen, refetch]);

  const handleCreateNew = async (): Promise<void> => {
    try {
      const newSession = await createSessionMutation.mutateAsync();
      showToast('Session created successfully', 'success');
      onSessionSelected(newSession);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      showToast(errorMessage, 'error');
    }
  };

  const handleSelectExisting = (session: ConsoleSession): void => {
    if (session.status !== 'running') {
      showToast('Cannot connect to stopped or errored session', 'error');
      return;
    }
    onSessionSelected(session);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Terminal Session">
      <div className="space-y-4">
        {/* Create New Session Button */}
        <Button
          onClick={handleCreateNew}
          variant="primary"
          className="w-full"
          loading={createSessionMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Session
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Or connect to existing session
            </span>
          </div>
        </div>

        {/* Session List */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading sessions...
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            Failed to load sessions. Please try again.
          </div>
        )}

        {!isLoading && !error && sessions && (
          <div className="max-h-96 overflow-y-auto">
            <SessionList sessions={sessions} onSelect={handleSelectExisting} />
          </div>
        )}
      </div>
    </Modal>
  );
}
