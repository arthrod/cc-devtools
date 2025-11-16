import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps): JSX.Element {
  return (
    <div className={clsx('flex items-center justify-center pt-8', className)}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={clsx(
            'animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-primary-500',
            {
              'h-4 w-4': size === 'sm',
              'h-8 w-8': size === 'md',
              'h-12 w-12': size === 'lg',
            }
          )}
          role="status"
          aria-label={message ?? 'Loading...'}
        />
        {message && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        )}
      </div>
    </div>
  );
}
