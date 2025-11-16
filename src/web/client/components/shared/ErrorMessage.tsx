import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface ErrorMessageProps {
  message: string;
  details?: string;
  className?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, details, className, onRetry, onDismiss: _onDismiss }: ErrorMessageProps): JSX.Element {
  return (
    <div className={clsx('flex items-center space-x-2 text-red-600 dark:text-red-400', className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1">
        <span className="text-sm">{message}</span>
        {details && (
          <div className="text-xs text-red-500 dark:text-red-300 mt-1">
            {details}
          </div>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm underline hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
