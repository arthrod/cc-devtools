import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ChipProps {
  label: string;
  onRemove?: () => void;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
}

export function Chip({
  label,
  onRemove,
  onClick,
  icon,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed
}: ChipProps): JSX.Element {
  const baseClasses = clsx(
    'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
    {
      // Sizes
      'px-2 py-0.5 text-xs': size === 'sm',
      'px-3 py-1 text-sm': size === 'md',
      'px-4 py-1.5 text-base': size === 'lg',

      // Variants
      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300': variant === 'default' && !disabled,
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': variant === 'primary' && !disabled,
      'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200': variant === 'secondary' && !disabled,
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': variant === 'success' && !disabled,
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': variant === 'warning' && !disabled,
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': variant === 'danger' && !disabled,

      // States
      'opacity-50 cursor-not-allowed': disabled,
      'cursor-pointer hover:opacity-80': onClick && !disabled,
    },
    className
  );

  const content = (
    <>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      {onRemove && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 ml-1 hover:text-current focus:outline-none focus:ring-1 focus:ring-current rounded-full"
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </>
  );

  if (onClick && !disabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClasses}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={baseClasses} aria-label={ariaLabel}>
      {content}
    </span>
  );
}
