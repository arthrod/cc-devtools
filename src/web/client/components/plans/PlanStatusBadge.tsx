import React from 'react';
import type { PlanStatus } from '../../../../web/shared/types/plans.js';

interface PlanStatusBadgeProps {
  status: PlanStatus;
  className?: string;
}

/**
 * Badge component displaying plan status with appropriate color coding
 */
export const PlanStatusBadge: React.FC<PlanStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: PlanStatus): { label: string; className: string } => {
    switch (status) {
      case 'planning':
        return { label: 'Planning', className: 'bg-blue-100 text-blue-800' };
      case 'in_progress':
        return { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' };
      case 'completed':
        return { label: 'Completed', className: 'bg-green-100 text-green-800' };
      case 'on_hold':
        return { label: 'On Hold', className: 'bg-gray-100 text-gray-800' };
      case 'abandoned':
        return { label: 'Abandoned', className: 'bg-red-100 text-red-800' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
};
