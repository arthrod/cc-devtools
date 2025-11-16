import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'bordered' | 'elevated';
  interactive?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card = React.memo(
  React.forwardRef<HTMLDivElement, CardProps>(
    ({ children, className, padding = 'md', variant = 'default', interactive = false, onClick, style }, ref) => {
      const isClickable = onClick !== undefined || interactive;

      return (
        <div
          ref={ref}
          onClick={onClick}
          style={style}
          className={clsx(
            {
              'card': variant === 'default',
              'card-bordered': variant === 'bordered',
              'card-elevated': variant === 'elevated',
            },
            {
              'card-interactive': isClickable,
              'cursor-pointer': onClick !== undefined,
            },
            {
              'p-0': padding === 'none',
              'p-4': padding === 'sm',
              'p-6': padding === 'md',
              'p-8': padding === 'lg',
            },
            className
          )}
        >
          {children}
        </div>
      );
    }
  )
);

Card.displayName = 'Card';
