import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ProgressBar } from '../shared/ProgressBar.js';
import type { RunProgress as RunProgressType } from '../../stores/perFileRunnerStore.js';

interface RunProgressProps {
  progress: RunProgressType;
  onCancel?: () => void;
  className?: string;
}

/**
 * Component showing real-time progress for a running config
 */
export function RunProgress({ progress, onCancel, className = '' }: RunProgressProps): JSX.Element {
  const [showLogs, setShowLogs] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(Math.floor((Date.now() - progress.startTime) / 1000));

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - progress.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [progress.startTime]);

  const percentage = progress.totalFiles > 0 ? (progress.filesProcessed / progress.totalFiles) * 100 : 0;
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const recentSuccesses = progress.recentFiles.filter((f) => f.success).slice(0, 3);
  const recentErrors = progress.recentFiles.filter((f) => !f.success).slice(0, 3);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress: {progress.filesProcessed}/{progress.totalFiles}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(percentage)}%</span>
        </div>
        <ProgressBar value={percentage} variant="primary" size="md" />
      </div>

      {/* Current File */}
      {progress.currentFile && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Currently processing:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100 font-mono truncate">{progress.currentFile}</p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {formatDuration(elapsedSeconds)} elapsed
            </span>
          </div>
        </div>
      )}

      {/* Recent Successes */}
      {recentSuccesses.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Recent successes:</p>
          <div className="space-y-1">
            {recentSuccesses.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 font-mono"
              >
                <span className="truncate flex-1">✓ {file.file}</span>
                <span className="ml-2 text-gray-500">({(file.duration / 1000).toFixed(1)}s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Recent errors:</p>
          <div className="space-y-1">
            {recentErrors.map((file, idx) => (
              <div key={idx} className="text-xs text-red-600 dark:text-red-400 font-mono truncate">
                ✗ {file.file}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="text-green-600 dark:text-green-400">✓ {progress.filesSucceeded} succeeded</span>
        {progress.filesFailed > 0 && (
          <span className="text-red-600 dark:text-red-400">✗ {progress.filesFailed} failed</span>
        )}
      </div>

      {/* Expandable Logs Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          {showLogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {showLogs ? 'Hide' : 'Show'} detailed logs
        </button>

        {showLogs && (
          <div className="mt-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 max-h-96 overflow-y-auto">
            <div className="space-y-3 text-xs font-mono">
              {progress.recentFiles.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No files processed yet</p>
              ) : (
                progress.recentFiles.map((file, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className={file.success ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                      {file.success ? '✓' : '✗'} {file.file} ({(file.duration / 1000).toFixed(1)}s)
                    </div>
                    {file.output && (
                      <pre className="ml-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                        {file.output}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <div className="pt-2">
          <button
            onClick={onCancel}
            disabled={progress.cancelling}
            className={`w-full px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
              progress.cancelling
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700 cursor-not-allowed'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-700'
            }`}
          >
            {progress.cancelling ? 'Cancelling... (finishing current file)' : 'Cancel Run'}
          </button>
        </div>
      )}
    </div>
  );
}
