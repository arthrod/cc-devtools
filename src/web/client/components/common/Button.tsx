import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'base' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable button component with consistent styling across variants and sizes.
 * Handles loading states by showing a spinner and automatically disabling interaction.
 */
export function Button({
  variant = 'primary',
  size = 'base',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          // Primary and Danger buttons (salmon/red brand color)
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'primary' || variant === 'danger',
          // Secondary button (gray)
          'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600': variant === 'secondary',
          // Ghost button (transparent)
          'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800': variant === 'ghost',
          // Sizes (responsive: 40px/36px mobile/desktop base, WCAG compliant)
          'h-9 sm:h-8 px-3 text-xs min-w-[2.75rem]': size === 'sm',
          'h-10 sm:h-9 px-4 text-sm min-w-[3rem]': size === 'base',
          'h-12 sm:h-11 px-6 text-base min-w-[3.5rem]': size === 'lg',
          // Disabled state
          'opacity-50 cursor-not-allowed': loading || disabled,
        },
        className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent opacity-60" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
