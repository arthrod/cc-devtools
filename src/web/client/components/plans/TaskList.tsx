import React from 'react';
import type { Task, TaskStatus } from '../../../../web/shared/types/plans.js';

interface TaskListProps {
  tasks: Task[];
  className?: string;
}

/**
 * Component displaying a list of plan tasks with status indicators
 */
export const TaskList: React.FC<TaskListProps> = ({ tasks, className = '' }) => {
  const getStatusIcon = (status: TaskStatus): JSX.Element => {
    switch (status) {
      case 'completed':
        return <span className="text-green-500 font-semibold">✓</span>;
      case 'in_progress':
        return <span className="text-blue-500 font-semibold">▶</span>;
      case 'pending':
        return <span className="text-gray-400">○</span>;
      default:
        return <span className="text-gray-400">○</span>;
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No tasks defined
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {tasks.map((task, index) => (
        <div key={index} className="flex items-start gap-2 text-sm">
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon(task.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900">{task.summary}</div>
            {task.details && (
              <div className="text-gray-600 text-xs mt-1 whitespace-pre-wrap">
                {task.details}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Status: {getStatusLabel(task.status)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
