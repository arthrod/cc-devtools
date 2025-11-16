import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../shared/Button.js';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation modal for closing a form with unsaved changes.
 * Warns the user that they will lose their work if they proceed.
 */
export function UnsavedChangesModal({
  isOpen,
  onClose,
  onConfirm
}: UnsavedChangesModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusFirstElement = (): void => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0]?.focus();
      }
    };

    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'input:not([disabled]):not([tabindex="-1"])',
        'button:not([disabled]):not([tabindex="-1"])',
        'textarea:not([disabled]):not([tabindex="-1"])',
        'select:not([disabled]):not([tabindex="-1"])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]:not([contenteditable="false"])'
      ];

      const elements = modal.querySelectorAll(selectors.join(','));
      return Array.from(elements).filter((el): el is HTMLElement => {
        if (!(el instanceof HTMLElement)) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
      });
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!modal.contains(e.target as Node)) return;

      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const timeoutId = setTimeout(focusFirstElement, 10);

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center space-x-3 p-6 border-b border-neutral-200 dark:border-neutral-700">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Unsaved Changes
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            You have unsaved changes that will be lost if you close this form.
          </p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Are you sure you want to close without saving?
          </p>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Keep Editing
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
          >
            Discard Changes
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
