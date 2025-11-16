interface ProgressBarProps {
  value: number;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({
  value,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  className = '',
  animated = true
}: ProgressBarProps): JSX.Element {

  const clampedValue = Math.max(0, Math.min(100, value));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const fillClasses = {
    primary: 'bg-red-600 dark:bg-red-500',
    success: 'bg-green-600 dark:bg-green-500',
    warning: 'bg-amber-600 dark:bg-amber-500',
    error: 'bg-red-600 dark:bg-red-500'
  };

  const animationClasses = animated
    ? 'transition-all duration-300 ease-out'
    : '';

  const displayLabel = label ?? (showLabel ? `${Math.round(clampedValue)}%` : '');

  return (
    <div className={`w-full ${className}`}>
      {displayLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {displayLabel}
          </span>
          {!label && showLabel && (
            <span className="text-sm text-neutral-500 dark:text-neutral-400 metric">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${fillClasses[variant]} ${animationClasses} h-full rounded-full`}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={displayLabel || `${Math.round(clampedValue)}% complete`}
        />
      </div>
    </div>
  );
}
