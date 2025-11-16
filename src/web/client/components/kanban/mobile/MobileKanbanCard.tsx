import { useState, useRef, useCallback } from 'react';
import { Clock, CheckCircle2, FileText } from 'lucide-react';
import { isStoryReadyForReady } from '../../../utils/readiness-utils';
import type { Story, SubtaskStatus } from '../../../../../kanban/types.js';
import { useQuery } from '@tanstack/react-query';
import { fetchStoryReviews } from '../../../services/kanban.service';

interface MobileKanbanCardProps {
  story: Story;
  onEdit?: (story: Story) => void;
  onLongPress: (story: Story) => void;
  onDragMove?: (story: Story, direction: 'left' | 'right') => void;
  completedTaskStatuses?: SubtaskStatus[];
}

/**
 * Mobile-optimized kanban card with simplified information display and touch-friendly interactions.
 *
 * Features:
 * - Tap to expand/collapse detailed information
 * - Long-press (500ms) to trigger context menu
 * - Long-press + drag for card movement between columns
 * - Simplified collapsed state with essential info only
 * - Large touch targets (44px minimum)
 * - Progressive disclosure of information
 */
export function MobileKanbanCard({
  story,
  onEdit: _onEdit,
  onLongPress,
  onDragMove,
  completedTaskStatuses = ['done'],
}: MobileKanbanCardProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);
  const hasTriggeredLongPress = useRef(false);
  const hasMoved = useRef(false);

  const getBusinessValueColor = (value: string): string => {
    const colors = {
      'XS': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'S': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'M': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'L': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'XL': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return colors[value as keyof typeof colors] ?? colors.M;
  };

  const completedSubtasks = story.subtasks?.filter(s => s.status && completedTaskStatuses.includes(s.status)).length ?? 0;
  const totalSubtasks = story.subtasks?.length ?? 0;
  const hasSubtasks = totalSubtasks > 0;

  const isReadyForReady = isStoryReadyForReady(story);

  const { data: reviews = [] } = useQuery({
    queryKey: ['story-reviews', story.id],
    queryFn: () => fetchStoryReviews(story.id),
    staleTime: 5 * 60 * 1000,
  });

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
      onDragMove(story, dragDirection);
    } else if (hasTriggeredLongPress.current && !hasMoved.current) {
      onLongPress(story);
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
  }, [isDragging, dragDirection, onDragMove, story, onLongPress]);

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
        ${isReadyForReady ? 'bg-green-50 dark:bg-green-900/10' : 'bg-white dark:bg-gray-700'}
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
            {story.id}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-5 mb-3 line-clamp-2">
          {story.title}
        </h4>

        {/* Essential Info Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              getBusinessValueColor(story.business_value ?? 'M')
            }`}>
              {story.business_value}
            </span>

            <div className="flex items-center space-x-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{story.effort_estimation_hours ?? 0}h</span>
            </div>

            {reviews.length > 0 && (
              <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                <FileText className="h-3 w-3" />
                <span>{reviews.length}</span>
              </div>
            )}
          </div>

          {hasSubtasks && (
            <div className="flex items-center space-x-1 text-gray-500">
              <CheckCircle2 className="h-3 w-3" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {hasSubtasks && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content - Conditional */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-600">
          {/* Description */}
          <div className="pt-4 pb-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {story.description}
            </p>
          </div>

          {/* Subtasks */}
          {hasSubtasks && (
            <div className="pb-3">
              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Subtasks
              </h5>
              <div className="space-y-2">
                {story.subtasks?.map((subtask) => (
                  <div key={subtask.id} className="flex items-start space-x-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      subtask.status && completedTaskStatuses.includes(subtask.status)
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        subtask.status && completedTaskStatuses.includes(subtask.status)
                          ? 'line-through text-gray-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {subtask.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {subtask.effort_estimation_hours ?? 0}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {story.dependent_upon && story.dependent_upon.length > 0 && (
            <div className="pt-3">
              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Blocked By
              </h5>
              <div className="flex flex-wrap gap-2">
                {story.dependent_upon.map((dependencyId) => (
                  <span
                    key={dependencyId}
                    className="inline-block px-2 py-1 text-xs font-mono bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded border"
                  >
                    {dependencyId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
