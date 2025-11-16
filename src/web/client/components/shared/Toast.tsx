import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
}

export function Toast({ id: _id, type, title, message, duration = 5000, onClose }: ToastProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);

      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const Icon = icons[type];

  return (
    <div
      className={clsx(
        'pointer-events-auto w-full min-w-[320px] max-w-md sm:max-w-lg overflow-hidden rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700 transition-all duration-300',
        {
          'translate-x-0 opacity-100': isVisible,
          'translate-x-full opacity-0': !isVisible,
        }
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon
              className={clsx('h-5 w-5', {
                'text-green-500': type === 'success',
                'text-red-500': type === 'error',
                'text-blue-500': type === 'info',
              })}
              aria-hidden="true"
            />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
            {message && (
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{message}</p>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md bg-white dark:bg-neutral-800 text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 transition-colors duration-200"
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              aria-label="Close notification"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
