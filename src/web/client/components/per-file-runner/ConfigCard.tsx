import { ChevronDown, ChevronRight, Play, Edit, Trash2, RefreshCw, FileText } from 'lucide-react';
import type { PerFileRunnerConfig, ConfigStatusSummary } from '../../../../web/shared/types/per-file-runner.js';
import type { RunProgress } from '../../stores/perFileRunnerStore.js';
import { ConfigStatusBadge } from './ConfigStatusBadge.js';
import { RunProgress as RunProgressComponent } from './RunProgress.js';
import { Badge } from '../shared/Badge.js';
import { Button } from '../common/Button.js';

interface ConfigCardProps {
  config: PerFileRunnerConfig;
  status: ConfigStatusSummary;
  isExpanded: boolean;
  runProgress: RunProgress | undefined;
  onToggle: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
  onViewFiles: () => void;
  onCancelRun?: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * Individual config card component with expandable details and run progress
 */
export function ConfigCard({
  config,
  status,
  isExpanded,
  runProgress,
  onToggle,
  onRun,
  onEdit,
  onDelete,
  onReset,
  onViewFiles,
  onCancelRun,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
}: ConfigCardProps): JSX.Element {
  const isRunning = !!runProgress;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Card Header - Clickable */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={onToggle}
        onContextMenu={onContextMenu}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </div>

            <Badge variant="neutral" size="sm" className="flex-shrink-0">
              [Pri {config.priority}]
            </Badge>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{config.name}</h3>

            {isRunning && (
              <Badge variant="primary" size="sm" className="flex-shrink-0">
                🔄 RUNNING
              </Badge>
            )}
          </div>
        </div>

        {/* Status Summary */}
        <div className="ml-8 flex items-center gap-2 text-sm">
          {isRunning && runProgress ? (
            <span className="text-gray-600 dark:text-gray-400">
              ⚠ Processing {runProgress.totalFiles - runProgress.filesProcessed} files ({runProgress.filesProcessed}/
              {runProgress.totalFiles} complete)
            </span>
          ) : (
            <ConfigStatusBadge
              filesNew={status.filesNew}
              filesOutOfDate={status.filesOutOfDate}
              filesUpToDate={status.filesUpToDate}
              totalFiles={status.totalFiles}
              isRunning={false}
            />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="p-4 space-y-4">
            {/* Running Progress */}
            {isRunning && runProgress && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                <RunProgressComponent progress={runProgress} onCancel={onCancelRun} />
              </div>
            )}

            {/* Configuration Details */}
            {!isRunning && (
              <>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Configuration</h4>

                  <div className="space-y-2 text-sm">
                    {/* Prompt */}
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Prompt:</span>
                      <pre className="mt-1 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto text-xs font-mono">
                        {config.prompt}
                      </pre>
                    </div>

                    {/* Command */}
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Command:</span>
                      <code className="block mt-1 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 text-xs font-mono">
                        {config.command} {config.args.join(' ')}
                      </code>
                    </div>

                    {/* Timeout */}
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Timeout:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {config.timeout}ms ({Math.floor(config.timeout / 60000)} minutes)
                      </span>
                    </div>

                    {/* Glob Patterns */}
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Glob Patterns:</span>
                      <div className="mt-1 space-y-1">
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-500">Include:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {config.glob.include.map((pattern, idx) => (
                              <code
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded border border-green-300 dark:border-green-700"
                              >
                                {pattern}
                              </code>
                            ))}
                          </div>
                        </div>
                        {config.glob.exclude && config.glob.exclude.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-500">Exclude:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {config.glob.exclude.map((pattern, idx) => (
                                <code
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded border border-red-300 dark:border-red-700"
                                >
                                  {pattern}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Status */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">File Status</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400">✓ {status.filesUpToDate} up-to-date</span>
                    {status.filesOutOfDate > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">⚠ {status.filesOutOfDate} out-of-date</span>
                    )}
                    {status.filesNew > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">● {status.filesNew} new</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onRun} variant="primary" size="sm" icon={<Play className="w-4 h-4" />}>
                    Run
                  </Button>
                  <Button onClick={onViewFiles} variant="secondary" size="sm" icon={<FileText className="w-4 h-4" />}>
                    View Files
                  </Button>
                  <Button onClick={onEdit} variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />}>
                    Edit
                  </Button>
                  <Button onClick={onReset} variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />}>
                    Reset State
                  </Button>
                  <Button onClick={onDelete} variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />}>
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
