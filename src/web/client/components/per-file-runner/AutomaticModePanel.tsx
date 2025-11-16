import { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '../common/Button.js';
import { ProgressBar } from '../shared/ProgressBar.js';
import type { AutomaticModeStatus } from '../../../../web/shared/types/per-file-runner.js';

interface AutomaticModePanelProps {
  status: AutomaticModeStatus;
  onStart: () => void;
  onStop: () => void;
  isStarting?: boolean;
  isStopping?: boolean;
}

/**
 * Simplified automatic mode status bar - always visible
 * Shows status, overall progress, and start/stop control
 */
export function AutomaticModePanel({
  status,
  onStart,
  onStop,
  isStarting = false,
  isStopping = false,
}: AutomaticModePanelProps): JSX.Element {
  const [countdown, setCountdown] = useState<string>('');

  // Calculate countdown to next run
  useEffect(() => {
    if (!status.running || !status.nextRunAt || status.overallProgress) {
      setCountdown('');
      return;
    }

    const updateCountdown = (): void => {
      const now = Date.now();
      const remaining = status.nextRunAt! - now;

      if (remaining <= 0) {
        setCountdown('');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status.running, status.nextRunAt, status.overallProgress]);

  // Determine status text
  const getStatusText = (): string => {
    if (!status.running && status.currentRun) {
      // Stopped but still has currentRun = finishing current file
      return 'Stopping (finishing current file)';
    }
    if (!status.running) {
      return 'Stopped';
    }
    if (status.overallProgress) {
      return 'Running';
    }
    if (countdown) {
      return `Paused - will start again in ${countdown}`;
    }
    return 'Running';
  };

  // Get progress values
  const progressPercent = status.overallProgress
    ? (status.overallProgress.filesProcessed / status.overallProgress.totalFiles) * 100
    : 0;

  const getProgressText = (): string => {
    if (status.overallProgress) {
      const { filesProcessed, totalFiles } = status.overallProgress;
      const filesRemaining = totalFiles - filesProcessed;

      if (status.running && !status.currentRun) {
        // Paused between runs
        return `${filesProcessed}/${totalFiles} files (${filesRemaining} remaining)`;
      }
      // Actively running
      return `${filesProcessed}/${totalFiles} files`;
    }
    return 'No files to process';
  };

  const progressText = getProgressText();

  // Status color and stopping detection
  const isStoppingAfterClick = !status.running && !!status.currentRun;
  const statusColor = status.running
    ? 'text-green-600 dark:text-green-400'
    : isStoppingAfterClick
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-gray-600 dark:text-gray-400';

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-6">
          {/* Status indicator */}
          <div className="flex-shrink-0">
            <div className="text-sm font-semibold">
              <span className="text-gray-700 dark:text-gray-300">Automatic Mode: </span>
              <span className={statusColor}>{getStatusText()}</span>
            </div>
          </div>

          {/* Progress section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">Progress:</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{progressText}</span>
            </div>
            <ProgressBar
              value={progressPercent}
              variant={status.overallProgress ? 'primary' : 'default'}
              size="sm"
            />
            {status.currentRun && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Currently processing: {status.currentRun.configName}
              </div>
            )}
          </div>

          {/* Control button */}
          <div className="flex-shrink-0">
            {status.running || isStoppingAfterClick ? (
              <Button
                onClick={onStop}
                variant="secondary"
                icon={<Square className="w-4 h-4" />}
                disabled={isStopping || isStoppingAfterClick}
                className="bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400"
              >
                {isStopping || isStoppingAfterClick ? 'Stopping...' : 'Stop'}
              </Button>
            ) : (
              <Button
                onClick={onStart}
                variant="primary"
                icon={<Play className="w-4 h-4" />}
                disabled={isStarting}
              >
                {isStarting ? 'Starting...' : 'Start'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
