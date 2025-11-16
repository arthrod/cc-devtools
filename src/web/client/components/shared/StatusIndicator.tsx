import { CheckCircle, AlertCircle, XCircle, Clock, Loader2 } from 'lucide-react';

/**
 * Status indicator component for displaying operational states
 *
 * Provides visual indicators for system status, connectivity,
 * health checks, and other operational states with icons and colors.
 */

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'pending' | 'loading';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  pulse?: boolean;
}

/**
 * Renders a status indicator with icon and optional label
 */
export function StatusIndicator({
  status,
  size = 'md',
  showLabel = false,
  label,
  className = '',
  pulse = false
}: StatusIndicatorProps): JSX.Element {

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const statusConfig = {
    online: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      label: 'Online'
    },
    offline: {
      icon: XCircle,
      color: 'text-neutral-400 dark:text-neutral-500',
      bgColor: 'bg-neutral-100 dark:bg-neutral-800',
      label: 'Offline'
    },
    warning: {
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20',
      label: 'Warning'
    },
    error: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      label: 'Error'
    },
    pending: {
      icon: Clock,
      color: 'text-neutral-500',
      bgColor: 'bg-neutral-100 dark:bg-neutral-800',
      label: 'Pending'
    },
    loading: {
      icon: Loader2,
      color: 'text-primary-500',
      bgColor: 'bg-primary-100 dark:bg-primary-900/20',
      label: 'Loading'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const pulseClasses = pulse ? 'animate-pulse' : '';
  const spinClasses = status === 'loading' ? 'animate-spin' : '';

  const displayLabel = label ?? config.label;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`rounded-full p-1 ${config.bgColor} ${pulseClasses}`}>
        <Icon
          className={`${sizeClasses[size]} ${config.color} ${spinClasses}`}
          aria-hidden="true"
        />
      </div>
      {showLabel && (
        <span className={`${textSizeClasses[size]} font-medium text-neutral-700 dark:text-neutral-300 font-ui`}>
          {displayLabel}
        </span>
      )}
    </div>
  );
}
