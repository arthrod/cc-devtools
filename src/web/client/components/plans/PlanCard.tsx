import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Plan } from '../../../../web/shared/types/plans.js';
import { PlanStatusBadge } from './PlanStatusBadge.js';
import { MarkdownContent } from '../shared/MarkdownContent.js';

interface PlanCardProps {
  plan: Plan;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  className?: string;
}

/**
 * Card component for displaying plan summary in list view
 * Can be expanded to show tasks inline
 */
export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isExpanded = false,
  onToggleExpand,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  className = ''
}) => {
  const completedTasks = plan.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = plan.tasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={onToggleExpand}
        onContextMenu={onContextMenu}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {plan.summary}
            </h3>
          </div>
          <PlanStatusBadge status={plan.status} className="flex-shrink-0 ml-2" />
        </div>

        {/* Goal */}
        <div className="mb-3 ml-8">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Goal:</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{plan.goal}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between ml-8 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 dark:text-gray-400">
              Tasks: <span className="font-medium text-gray-900 dark:text-gray-100">{completedTasks}/{totalTasks}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Progress: <span className="font-medium text-gray-900 dark:text-gray-100">{completionPercentage}%</span>
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Updated: {formatDate(plan.updated_at)}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <div className="space-y-3 text-sm">
            {/* Decisions */}
            {plan.decisions && (
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Decisions:</p>
                <MarkdownContent content={plan.decisions} scrollable />
              </div>
            )}

            {/* Implementation Plan */}
            {plan.implementation_plan && (
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Implementation Plan:</p>
                <MarkdownContent content={plan.implementation_plan} scrollable />
              </div>
            )}

            {/* Tasks */}
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tasks ({totalTasks}):</p>
              <div className="space-y-2">
                {plan.tasks.map((task, index) => (
                  <div key={index} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{task.summary}</p>
                        {task.details && (
                          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{task.details}</p>
                        )}
                        <div className="mt-1">
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded ${
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {plan.notes && (
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Notes:</p>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-xs">{plan.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Created: {formatDate(plan.created_at)}</span>
              <span>Updated: {formatDate(plan.updated_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
