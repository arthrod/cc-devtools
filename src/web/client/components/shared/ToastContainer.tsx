import { useAppStore } from '../../stores/appStore';
import { Toast } from './Toast';

/**
 * Renders a container for stacked toast notifications in the bottom-right corner.
 * Automatically renders all toasts from the global app store with proper stacking.
 */
export function ToastContainer(): JSX.Element {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
