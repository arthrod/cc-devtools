import { useState } from 'react';
import { Copy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { useToast } from '../../hooks/useToast.js';
import type { RunProgress } from '../../stores/perFileRunnerStore.js';

interface ExecutionLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  runProgress: RunProgress | null;
}

/**
 * Modal displaying execution logs and results from a config run.
 * Shows file-by-file progress with timestamps and success/failure indicators.
 */
export function ExecutionLogsModal({ isOpen, onClose, runProgress }: ExecutionLogsModalProps): JSX.Element {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { showToast } = useToast();

  if (!runProgress) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Execution Logs" size="lg">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No execution logs available</div>
      </Modal>
    );
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTotalDuration = (): string => {
    const duration = Date.now() - runProgress.startTime;
    return formatDuration(duration);
  };

  const handleCopyLogs = (): void => {
    const logsText = [
      `Config: ${runProgress.configName}`,
      `Started: ${formatTimestamp(runProgress.startTime)}`,
      `Progress: ${runProgress.filesProcessed}/${runProgress.totalFiles} files`,
      `Success: ${runProgress.filesSucceeded}, Failed: ${runProgress.filesFailed}`,
      '',
      'Files:',
      ...runProgress.recentFiles.map(
        (f) => `${f.success ? '✓' : '✗'} ${f.file} (${formatDuration(f.duration)})`
      ),
    ].join('\n');

    navigator.clipboard
      .writeText(logsText)
      .then(() => {
        showToast('Logs copied to clipboard', 'success');
      })
      .catch(() => {
        showToast('Failed to copy logs', 'error');
      });
  };

  const handleCopyFile = (file: string, index: number): void => {
    navigator.clipboard
      .writeText(file)
      .then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      })
      .catch(() => {
        showToast('Failed to copy file path', 'error');
      });
  };

  const isRunning = runProgress.filesProcessed < runProgress.totalFiles;
  const successRate =
    runProgress.filesProcessed > 0
      ? Math.round((runProgress.filesSucceeded / runProgress.filesProcessed) * 100)
      : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Execution Logs: ${runProgress.configName}`} size="lg">
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {isRunning ? '🔄 Running' : '✓ Complete'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Progress</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {runProgress.filesProcessed} / {runProgress.totalFiles}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Success Rate</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {successRate}% ({runProgress.filesSucceeded}/{runProgress.filesProcessed})
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getTotalDuration()}</div>
          </div>
        </div>

        {/* Current File */}
        {runProgress.currentFile && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              <span className="font-medium text-blue-900 dark:text-blue-100">Currently Processing:</span>
              <span className="font-mono text-blue-700 dark:text-blue-300">{runProgress.currentFile}</span>
            </div>
          </div>
        )}

        {/* Recent Files */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Recent Files ({runProgress.recentFiles.length})
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyLogs}
              icon={<Copy className="w-3 h-3" />}
            >
              Copy All
            </Button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
            {runProgress.recentFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No files processed yet
              </div>
            ) : (
              runProgress.recentFiles.map((file, index) => (
                <div
                  key={`${file.file}-${index}`}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    index > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''
                  } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    {file.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">{file.file}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Duration: {formatDuration(file.duration)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyFile(file.file, index)}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Copy file path"
                  >
                    {copiedIndex === index ? (
                      <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Started at {formatTimestamp(runProgress.startTime)}
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
