import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const Badge = React.memo(function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  onClick
}: BadgeProps): JSX.Element {

  const baseClasses = 'badge inline-flex items-center justify-center font-medium transition-colors duration-200';

  const variantClasses = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    neutral: 'badge-neutral'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1'
    : '';

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${interactiveClasses} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        tabIndex={0}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={classes}>
      {children}
    </span>
  );
});
