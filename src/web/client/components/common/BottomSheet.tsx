import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: BottomSheetAction[];
}

/**
 * Mobile-friendly bottom sheet component that slides up from the bottom of the screen.
 * Provides a touch-friendly alternative to floating context menus on mobile devices.
 *
 * Features:
 * - Slide-up animation with backdrop
 * - Touch-friendly action buttons with large hit areas
 * - Support for destructive actions with different styling
 * - Automatic close on backdrop tap or escape key
 * - Accessible with proper ARIA labels
 */
export function BottomSheet({ isOpen, onClose, title, actions }: BottomSheetProps): JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleBackdropClick = (event: MouseEvent): void => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleBackdropClick);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleBackdropClick);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out animate-in slide-in-from-bottom"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        {/* Handle bar for visual indication */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3
            id="bottom-sheet-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 space-y-2 max-h-96 overflow-y-auto">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className={`
                w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-left transition-colors
                min-h-[44px] touch-manipulation
                ${action.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : action.destructive
                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600'
                }
              `}
            >
              {action.icon && (
                <div className={`flex-shrink-0 ${
                  action.destructive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {action.icon}
                </div>
              )}
              <span className={`font-medium ${
                action.destructive
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Safe area padding for devices with home indicators */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}
