import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Plus, FileText } from 'lucide-react';
import type { PerFileRunnerConfig, ConfigStatusSummary } from '../../../../web/shared/types/per-file-runner.js';
import type { RunProgress } from '../../stores/perFileRunnerStore.js';
import { ConfigCard } from './ConfigCard.js';
import { Button } from '../common/Button.js';

interface VirtualizedConfigListProps {
  configs: PerFileRunnerConfig[];
  statuses: Map<string, ConfigStatusSummary>;
  runningConfigs: Map<string, RunProgress>;
  expandedConfigId: string | null;
  onToggleConfig: (configId: string) => void;
  onRun: (configId: string) => void;
  onEdit: (config: PerFileRunnerConfig) => void;
  onDelete: (configId: string) => void;
  onReset: (configId: string) => void;
  onViewFiles: (configId: string) => void;
  onCancelRun: (configId: string) => void;
  onContextMenu: (e: React.MouseEvent, config: PerFileRunnerConfig) => void;
  onTouchStart: (e: React.TouchEvent, config: PerFileRunnerConfig) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  header?: React.ReactNode;
  onNewConfig?: () => void;
}

/**
 * Virtualized config list component that efficiently renders large lists
 * by only rendering visible items in the viewport.
 */
export function VirtualizedConfigList({
  configs,
  statuses,
  runningConfigs,
  expandedConfigId,
  onToggleConfig,
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
  header,
  onNewConfig,
}: VirtualizedConfigListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: configs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    getItemKey: (index) => configs[index]?.id ?? index,
  });

  const items = virtualizer.getVirtualItems();

  if (configs.length === 0) {
    return (
      <div ref={parentRef} className="h-full overflow-auto">
        {header}
        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center space-y-4">
            <FileText size={64} className="mx-auto text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No configs yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Click "New Config" to create your first per-file runner configuration
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto" style={{ contain: 'strict' }}>
      {header}
      <div className="px-6 py-6">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
          className="max-w-7xl mx-auto"
        >
          {items.map((virtualItem) => {
            const config = configs[virtualItem.index];
            if (!config) return null;

            const status = statuses.get(config.id);
            if (!status) return null;

            const runProgress = runningConfigs.get(config.id);

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="mb-2"
              >
                <ConfigCard
                  config={config}
                  status={status}
                  isExpanded={expandedConfigId === config.id}
                  runProgress={runProgress}
                  onToggle={() => onToggleConfig(config.id)}
                  onRun={() => onRun(config.id)}
                  onEdit={() => onEdit(config)}
                  onDelete={() => onDelete(config.id)}
                  onReset={() => onReset(config.id)}
                  onViewFiles={() => onViewFiles(config.id)}
                  onCancelRun={() => onCancelRun(config.id)}
                  onContextMenu={(e) => onContextMenu(e, config)}
                  onTouchStart={(e) => onTouchStart(e, config)}
                  onTouchEnd={onTouchEnd}
                  onTouchMove={onTouchMove}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
