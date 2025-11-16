import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Play } from 'lucide-react';
import {
  useConfigs,
  useAllStatuses,
  useDeleteConfig,
  useResetConfig,
  useAutomaticStatus,
  useStartAutomatic,
  useStopAutomatic,
} from '../hooks/usePerFileRunner.js';
import { usePerFileRunnerStore } from '../stores/perFileRunnerStore.js';
import { useToast } from '../hooks/useToast.js';
import { VirtualizedConfigList } from '../components/per-file-runner/VirtualizedConfigList.js';
import { ConfigForm } from '../components/per-file-runner/ConfigForm.js';
import { DeleteConfigModal } from '../components/per-file-runner/DeleteConfigModal.js';
import { FileListModal } from '../components/per-file-runner/FileListModal.js';
import { ExecutionLogsModal } from '../components/per-file-runner/ExecutionLogsModal.js';
import { AutomaticModePanel } from '../components/per-file-runner/AutomaticModePanel.js';
import { FileRunnerErrorBoundary } from '../components/per-file-runner/FileRunnerErrorBoundary.js';
import { LoadingSpinner } from '../components/shared/LoadingSpinner.js';
import { ErrorMessage } from '../components/shared/ErrorMessage.js';
import { ContextMenu } from '../components/shared/ContextMenu.js';
import { BottomSheet, type BottomSheetAction } from '../components/common/BottomSheet.js';
import { Button } from '../components/common/Button.js';
import type { PerFileRunnerConfig, SSEEvent, ConfigStatusDetailed } from '../../../web/shared/types/per-file-runner.js';
import * as perFileRunnerService from '../services/per-file-runner.service.js';

/**
 * Per-File-Runner page component providing comprehensive config management,
 * file processing, and real-time execution monitoring with SSE updates.
 */
export function FileRunnerPage(): JSX.Element {
  const {
    expandedConfigId,
    setExpandedConfigId,
    runningConfigs,
    setRunProgress,
    updateRunProgress,
    clearRunProgress,
  } = usePerFileRunnerStore();

  const [selectedConfig, setSelectedConfig] = useState<PerFileRunnerConfig | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFileListModal, setShowFileListModal] = useState(false);
  const [showExecutionLogsModal, setShowExecutionLogsModal] = useState(false);
  const [selectedConfigStatus, setSelectedConfigStatus] = useState<ConfigStatusDetailed | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [touchTimeout, setTouchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const automaticEventSourceRef = useRef<EventSource | null>(null);

  const { showToast } = useToast();

  const { data: configs = [], isFetching: isLoadingConfigs, error: configsError, refetch: refetchConfigs } = useConfigs();
  const { data: statuses = [], isFetching: isLoadingStatuses, error: statusesError, refetch: refetchStatuses } = useAllStatuses();
  const { data: automaticStatus, refetch: refetchAutomaticStatus } = useAutomaticStatus();
  const { mutate: deleteConfig, isPending: isDeleting } = useDeleteConfig();
  const { mutate: resetConfig } = useResetConfig();
  const { mutate: startAutomatic, isPending: isStarting } = useStartAutomatic();
  const { mutate: stopAutomatic, isPending: isStopping } = useStopAutomatic();

  const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority);

  const statusesMap = useMemo(() => {
    const map = new Map();
    statuses.forEach((status) => map.set(status.configId, status));
    return map;
  }, [statuses]);

  const handleNewConfig = (): void => {
    setSelectedConfig(null);
    setShowConfigForm(true);
  };

  const handleEditConfig = (config: PerFileRunnerConfig): void => {
    setSelectedConfig(config);
    setShowConfigForm(true);
    setContextMenuVisible(false);
  };

  const handleShowDeleteModal = (): void => {
    setContextMenuVisible(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfig = (): void => {
    if (!selectedConfig) return;

    deleteConfig(selectedConfig.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setSelectedConfig(null);
        if (expandedConfigId === selectedConfig.id) {
          setExpandedConfigId(null);
        }
      },
    });
  };

  const handleCloseDeleteModal = (): void => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setSelectedConfig(null);
    }
  };

  const handleResetConfig = (configId: string): void => {
    resetConfig(configId, {
      onSuccess: () => {
        // Refetch automatic status to update the overall progress bar
        void refetchAutomaticStatus();
      },
    });
    setContextMenuVisible(false);
  };

  const handleRunConfig = (configId: string): void => {
    const config = configs.find((c) => c.id === configId);
    if (!config) return;

    if (runningConfigs.has(configId)) {
      showToast('Config is already running', 'warning');
      return;
    }

    const eventSource = perFileRunnerService.createRunEventSource(configId, false);
    eventSourcesRef.current.set(configId, eventSource);

    setRunProgress(configId, {
      configId,
      configName: config.name,
      currentFile: null,
      filesProcessed: 0,
      filesSucceeded: 0,
      filesFailed: 0,
      totalFiles: 0,
      recentFiles: [],
      startTime: Date.now(),
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;

        if (data.type === 'run-start') {
          updateRunProgress(configId, {
            totalFiles: data.data.totalFiles,
          });
        } else if (data.type === 'file-start') {
          updateRunProgress(configId, {
            currentFile: data.data.file,
          });
        } else if (data.type === 'file-success') {
          updateRunProgress(configId, (prev) => ({
            ...prev,
            filesProcessed: prev.filesProcessed + 1,
            filesSucceeded: prev.filesSucceeded + 1,
            currentFile: null,
            recentFiles: [
              { file: data.data.file, success: true, duration: data.data.duration, output: data.data.output },
              ...prev.recentFiles.slice(0, 9),
            ],
          }));
        } else if (data.type === 'file-error') {
          updateRunProgress(configId, (prev) => ({
            ...prev,
            filesProcessed: prev.filesProcessed + 1,
            filesFailed: prev.filesFailed + 1,
            currentFile: null,
            recentFiles: [
              { file: data.data.file, success: false, duration: 0, output: data.data.output },
              ...prev.recentFiles.slice(0, 9),
            ],
          }));
          showToast(`Error processing ${data.data.file}: ${data.data.error}`, 'error');
        } else if (data.type === 'run-complete') {
          // Clean up before closing to prevent error handler from firing
          const es = eventSourcesRef.current.get(configId);
          if (es) {
            es.onmessage = null;
            es.onerror = null;
            es.close();
            eventSourcesRef.current.delete(configId);
          }
          clearRunProgress(configId);
          void refetchStatuses();
          showToast(
            `Run complete: ${data.data.filesSucceeded} succeeded, ${data.data.filesFailed} failed`,
            data.data.filesFailed > 0 ? 'warning' : 'success'
          );
        } else if (data.type === 'run-error') {
          // Clean up before closing to prevent error handler from firing
          const es = eventSourcesRef.current.get(configId);
          if (es) {
            es.onmessage = null;
            es.onerror = null;
            es.close();
            eventSourcesRef.current.delete(configId);
          }
          clearRunProgress(configId);
          showToast(`Run failed: ${data.data.error}`, 'error');
        }
      } catch {
        showToast('Failed to parse progress update', 'error');
      }
    };

    eventSource.onerror = () => {
      // Check if this event source is still being tracked (not cleaned up by completion)
      if (eventSourcesRef.current.has(configId)) {
        eventSource.close();
        eventSourcesRef.current.delete(configId);
        clearRunProgress(configId);
        showToast('Connection to server lost', 'error');
      }
    };

    setContextMenuVisible(false);
  };

  const handleCancelRun = (configId: string): void => {
    // Mark as cancelling - this will disable the cancel button
    updateRunProgress(configId, { cancelling: true });

    // Close the EventSource to signal backend to stop
    const eventSource = eventSourcesRef.current.get(configId);
    if (eventSource) {
      // Backend will detect disconnect and abort after current file
      eventSource.close();
      eventSourcesRef.current.delete(configId);
    }

    // Clear the UI after a delay to ensure current file finishes
    // Show a message that we're waiting for current file
    setTimeout(() => {
      clearRunProgress(configId);
      void refetchStatuses();
      showToast('Run cancelled', 'info');
    }, 2000);
  };

  const handleViewFiles = async (configId: string): Promise<void> => {
    const config = configs.find((c) => c.id === configId);
    if (!config) return;

    try {
      const status = await perFileRunnerService.fetchConfigStatus(configId);
      setSelectedConfig(config);
      setSelectedConfigStatus(status);
      setShowFileListModal(true);
      setContextMenuVisible(false);
    } catch (error) {
      showToast(
        `Failed to load file list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleViewLogs = (configId: string): void => {
    const progress = runningConfigs.get(configId);
    if (!progress) {
      showToast('No execution logs available for this config', 'info');
      return;
    }
    setShowExecutionLogsModal(true);
    setContextMenuVisible(false);
  };

  const handleConfigContextMenu = (e: React.MouseEvent, config: PerFileRunnerConfig): void => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedConfig(config);
    setContextMenuPosition({ x: e.pageX, y: e.pageY });
    setContextMenuVisible(true);
  };

  const handleTouchStart = (e: React.TouchEvent, config: PerFileRunnerConfig): void => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
      const timeout = setTimeout(() => {
        // On mobile, use bottom sheet instead of context menu
        setSelectedConfig(config);
        setShowBottomSheet(true);
      }, 500);
      setTouchTimeout(timeout);
    }
  };

  const handleTouchEnd = (): void => {
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      setTouchTimeout(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (touchTimeout) {
      const touch = e.touches[0];
      if (touch) {
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(touchTimeout);
          setTouchTimeout(null);
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setContextMenuVisible(false);
      }
    };

    if (contextMenuVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuVisible]);


  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach((eventSource) => eventSource.close());
      eventSourcesRef.current.clear();
      if (automaticEventSourceRef.current) {
        automaticEventSourceRef.current.close();
        automaticEventSourceRef.current = null;
      }
    };
  }, []);

  // Set up SSE connection when automatic mode is running
  useEffect(() => {
    if (automaticStatus?.running && !automaticEventSourceRef.current) {
      const eventSource = perFileRunnerService.createAutomaticModeEventSource();
      automaticEventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;

          if (data.type === 'run-start') {
            // Initial status update
            void refetchAutomaticStatus();
          } else if (data.type === 'file-start') {
            // Update automatic status when file starts
            void refetchAutomaticStatus();
          } else if (data.type === 'file-success' || data.type === 'file-error') {
            // File completed - update both automatic status AND individual config statuses
            void refetchAutomaticStatus();
            void refetchStatuses();
          } else if (data.type === 'run-complete') {
            // Run complete - clean up event source and update statuses
            const es = automaticEventSourceRef.current;
            if (es) {
              es.onmessage = null;
              es.onerror = null;
              es.close();
              automaticEventSourceRef.current = null;
            }
            void refetchAutomaticStatus();
            void refetchStatuses();
          }
        } catch {
          showToast('Failed to parse automatic mode update', 'error');
        }
      };

      eventSource.onerror = () => {
        // Check if this event source is still being tracked (not cleaned up by completion)
        if (automaticEventSourceRef.current) {
          automaticEventSourceRef.current.close();
          automaticEventSourceRef.current = null;
          showToast('Connection to automatic mode lost', 'error');
        }
      };
    } else if (!automaticStatus?.running && !automaticStatus?.currentRun && automaticEventSourceRef.current) {
      // Clean up when automatic mode fully stops (not just stopping)
      automaticEventSourceRef.current.close();
      automaticEventSourceRef.current = null;
      // Refetch statuses to show updated progress after stopping
      void refetchAutomaticStatus();
      void refetchStatuses();
    }
  }, [automaticStatus?.running, automaticStatus?.currentRun, refetchAutomaticStatus, refetchStatuses, showToast]);

  const isLoading = isLoadingConfigs || isLoadingStatuses;
  const error = configsError ?? statusesError;

  if (isLoading && sortedConfigs.length === 0) {
    return <LoadingSpinner message="Loading configs..." />;
  }

  return (
    <FileRunnerErrorBoundary>
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">
        <VirtualizedConfigList
          configs={sortedConfigs}
          statuses={statusesMap}
          runningConfigs={runningConfigs}
          expandedConfigId={expandedConfigId}
          onToggleConfig={(id) => setExpandedConfigId(expandedConfigId === id ? null : id)}
          onRun={(id) => handleRunConfig(id)}
          onEdit={handleEditConfig}
          onDelete={handleShowDeleteModal}
          onReset={handleResetConfig}
          onViewFiles={(id) => void handleViewFiles(id)}
          onCancelRun={handleCancelRun}
          onNewConfig={handleNewConfig}
          onContextMenu={handleConfigContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          header={
            <>
              {/* Header with New Config Button */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-end gap-4">
                    {/* New Config Button */}
                    <Button
                      onClick={handleNewConfig}
                      variant="primary"
                      className="flex items-center gap-2"
                      aria-label="Create new config"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Config</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Automatic Mode Panel - Only shown when configs exist */}
              {automaticStatus && configs.length > 0 && (
                <AutomaticModePanel
                  status={automaticStatus}
                  onStart={() => startAutomatic()}
                  onStop={() => stopAutomatic()}
                  isStarting={isStarting}
                  isStopping={isStopping}
                />
              )}

              {error && (
                <div className="px-6 pt-6">
                  <div className="max-w-7xl mx-auto">
                    <ErrorMessage
                      message={error instanceof Error ? error.message : 'Failed to load configs'}
                      onDismiss={() => {
                        /* Error is from React Query, will auto-dismiss on retry */
                      }}
                      className="mb-6"
                    />
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>

      {/* Context Menu for Desktop (right-click) */}
      <ContextMenu
        isOpen={contextMenuVisible && !!selectedConfig}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        items={[
          {
            label: 'Run',
            icon: <Play className="w-4 h-4" />,
            onClick: () => {
              if (selectedConfig) {
                handleRunConfig(selectedConfig.id);
              }
            },
          },
        ]}
        onClose={() => setContextMenuVisible(false)}
      />

      {/* Bottom Sheet for Mobile (long-press) */}
      <BottomSheet
        isOpen={showBottomSheet && !!selectedConfig}
        onClose={() => {
          setShowBottomSheet(false);
          setSelectedConfig(null);
        }}
        title={selectedConfig ? `Actions for ${selectedConfig.name}` : 'Config Actions'}
        actions={
          [
            {
              label: 'Run',
              icon: <Play className="w-4 h-4" />,
              onClick: () => {
                if (selectedConfig) {
                  handleRunConfig(selectedConfig.id);
                  setShowBottomSheet(false);
                  setSelectedConfig(null);
                }
              },
            },
          ] as BottomSheetAction[]
        }
      />

      {showConfigForm && <ConfigForm config={selectedConfig ?? undefined} onClose={() => setShowConfigForm(false)} />}

      <DeleteConfigModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfig}
        configName={selectedConfig?.name ?? null}
        isDeleting={isDeleting}
      />

      {showFileListModal && selectedConfig && selectedConfigStatus && (
        <FileListModal
          isOpen={showFileListModal}
          onClose={() => {
            setShowFileListModal(false);
            setSelectedConfigStatus(null);
          }}
          configId={selectedConfig.id}
          configName={selectedConfig.name}
          files={selectedConfigStatus.files}
        />
      )}

      {showExecutionLogsModal && selectedConfig && (
        <ExecutionLogsModal
          isOpen={showExecutionLogsModal}
          onClose={() => setShowExecutionLogsModal(false)}
          runProgress={runningConfigs.get(selectedConfig.id) ?? null}
        />
      )}

      </div>
    </FileRunnerErrorBoundary>
  );
}
