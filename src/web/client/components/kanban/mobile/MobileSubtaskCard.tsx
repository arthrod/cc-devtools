import { useState, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import type { Subtask, SubtaskStatus } from '../../../../../kanban/types.js';

export interface SubtaskWithParent extends Subtask {
  parentStoryId?: string;
  parentStoryTitle?: string;
}

interface MobileSubtaskCardProps {
  subtask: SubtaskWithParent;
  onEdit?: (subtask: Subtask) => void;
  onLongPress: (subtask: SubtaskWithParent) => void;
  onDragMove?: (subtask: SubtaskWithParent, direction: 'left' | 'right') => void;
  completedTaskStatuses: SubtaskStatus[];
}

/**
 * Mobile-optimized kanban subtask card with simplified information display and touch-friendly interactions.
 *
 * Features:
 * - Tap to expand/collapse detailed information
 * - Long-press (500ms) to trigger context menu
 * - Long-press + drag for subtask movement between columns
 * - Simplified collapsed state with essential info only
 * - Large touch targets (44px minimum)
 * - Progressive disclosure of information
 */
export function MobileSubtaskCard({
  subtask,
  onEdit: _onEdit,
  onLongPress,
  onDragMove,
  completedTaskStatuses = ['done'],
}: MobileSubtaskCardProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);
  const hasTriggeredLongPress = useRef(false);
  const hasMoved = useRef(false);

  const isCompleted = subtask.status && completedTaskStatuses.includes(subtask.status);

  const startLongPress = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    startPosition.current = { x: touch.clientX, y: touch.clientY };
    hasTriggeredLongPress.current = false;
    hasMoved.current = false;
    setIsLongPressing(true);

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    longPressTimer.current = window.setTimeout(() => {
      hasTriggeredLongPress.current = true;

      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!startPosition.current) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - startPosition.current.x;
    const deltaY = touch.clientY - startPosition.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 10) {
      hasMoved.current = true;

      if (longPressTimer.current && !hasTriggeredLongPress.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        setIsLongPressing(false);
      }
    }

    if (hasTriggeredLongPress.current && Math.abs(deltaX) > 30) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setIsDragging(true);
      setDragDirection(direction);
    }
  }, []);

  const endLongPress = useCallback(() => {
    if (isDragging && dragDirection && onDragMove) {
      onDragMove(subtask, dragDirection);
    } else if (hasTriggeredLongPress.current && !hasMoved.current) {
      onLongPress(subtask);
    }

    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
    setIsDragging(false);
    setDragDirection(null);
    startPosition.current = null;
    hasTriggeredLongPress.current = false;
    hasMoved.current = false;
  }, [isDragging, dragDirection, onDragMove, subtask, onLongPress]);

  const handleTap = useCallback((event: React.MouseEvent) => {
    if (!hasTriggeredLongPress.current) {
      event.preventDefault();
      setIsExpanded(prev => !prev);
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className={`
        ${isCompleted ? 'bg-green-50 dark:bg-green-900/10' : 'bg-white dark:bg-gray-700'}
        rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200
        ${isLongPressing ? 'scale-105 shadow-lg' : 'shadow-sm'}
        ${isDragging ? 'scale-110 shadow-2xl rotate-2' : ''}
        ${dragDirection === 'right' ? 'translate-x-2 border-green-300 bg-green-50 dark:bg-green-900/20' : ''}
        ${dragDirection === 'left' ? '-translate-x-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''}
        touch-manipulation select-none relative
      `}
      onTouchStart={startLongPress}
      onTouchMove={handleTouchMove}
      onTouchEnd={endLongPress}
      onTouchCancel={endLongPress}
      onClick={handleTap}
    >
      {/* Drag direction indicator */}
      {isDragging && (
        <div className={`
          absolute inset-y-0 w-1 ${dragDirection === 'right' ? 'right-0 bg-green-500' : 'left-0 bg-blue-500'}
          rounded-full animate-pulse
        `} />
      )}

      {/* Collapsed Content - Always Visible */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {subtask.id}
          </span>
        </div>

        {/* Title */}
        <h4 className={`font-medium text-sm leading-5 mb-3 line-clamp-2 ${
          isCompleted
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-900 dark:text-gray-100'
        }`}>
          {subtask.title}
        </h4>

        {/* Parent Story Info (if available) */}
        {subtask.parentStoryId && (
          <div className="mb-3">
            <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              {subtask.parentStoryId}
            </span>
          </div>
        )}

        {/* Essential Info Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{subtask.effort_estimation_hours ?? 0}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content - Conditional */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-600">
          {/* Description */}
          <div className="pt-4 pb-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {subtask.description}
            </p>
          </div>

          {/* Parent Story Details */}
          {subtask.parentStoryTitle && (
            <div className="pt-3">
              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Parent Story
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {subtask.parentStoryTitle}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
