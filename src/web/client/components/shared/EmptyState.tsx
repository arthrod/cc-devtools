import React from 'react';
import { FileX, Search, Plus, RefreshCw } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface EmptyStateProps {
  icon?: 'file' | 'search' | 'plus' | 'refresh' | React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon = 'file',
  title,
  description,
  action,
  className = ''
}: EmptyStateProps): JSX.Element {

  const iconMap = {
    file: FileX,
    search: Search,
    plus: Plus,
    refresh: RefreshCw
  };

  const Icon = typeof icon === 'string' ? iconMap[icon] : icon;

  return (
    <div className={`empty-state ${className}`}>
      <div className="mb-4 p-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <Icon className="empty-state-icon" aria-hidden="true" />
      </div>

      <h3 className="empty-state-title">
        {title}
      </h3>

      {description && (
        <p className="empty-state-description max-w-sm">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className={`btn ${action.variant === 'secondary' ? 'btn-secondary' : action.variant === 'ghost' ? 'btn-ghost' : 'btn-primary'} mt-4`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
