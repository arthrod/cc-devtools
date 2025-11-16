import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'base' | 'lg' | 'icon-sm' | 'icon-md' | 'icon-lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.memo(function Button({
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
        'btn',
        {
          'btn-primary': variant === 'primary',
          'btn-secondary': variant === 'secondary',
          'btn-ghost': variant === 'ghost',
          'btn-danger': variant === 'danger',
          // Regular sizes (text + padding)
          'h-9 sm:h-8 px-3 text-xs min-w-[2.75rem]': size === 'sm',
          'h-10 sm:h-9 px-4 text-sm min-w-[3rem]': size === 'base',
          'h-12 sm:h-11 px-6 text-base min-w-[3.5rem]': size === 'lg',
          // Icon sizes (square, centered, no horizontal padding)
          'h-8 w-8 sm:h-7 sm:w-7 p-0': size === 'icon-sm',
          'h-10 w-10 sm:h-9 sm:w-9 p-0': size === 'icon-md',
          'h-12 w-12 sm:h-11 sm:w-11 p-0': size === 'icon-lg',
          'opacity-50 cursor-not-allowed': loading || disabled,
        },
        className
      )}
      disabled={loading || disabled}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent opacity-60" aria-hidden="true" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
});
