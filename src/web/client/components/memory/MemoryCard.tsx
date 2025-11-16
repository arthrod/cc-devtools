import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Memory } from '../../../../web/shared/types/memory.js';
import { MarkdownContent } from '../shared/MarkdownContent.js';

interface MemoryCardProps {
  memory: Memory;
  isExpanded: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * Individual memory card component with expandable details
 */
export function MemoryCard({
  memory,
  isExpanded,
  onToggle,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
}: MemoryCardProps): JSX.Element {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {memory.summary}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(memory.created_at)}
            </span>
          </div>
        </div>

        {/* Preview of details (first 150 chars) */}
        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
          {memory.details}
        </p>

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="p-4 space-y-3">
            {/* Full Details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Details
              </h4>
              <MarkdownContent content={memory.details} scrollable />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
