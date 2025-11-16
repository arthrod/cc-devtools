import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

/**
 * Modal component with accessibility features and flexible styling.
 * Supports keyboard navigation, focus management, and body scroll prevention.
 */
export function Modal({
  children,
  isOpen,
  onClose,
  title,
  closeOnEscape = true,
  closeOnOverlayClick = true
}: ModalProps): React.ReactPortal | null {
  useEffect(() => {
    if (closeOnEscape) {
      const handleEscape = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return (): void => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    // Prevent background scrolling while modal is active
    document.body.style.overflow = 'hidden';

    // Focus the modal container for screen reader accessibility
    const modalElement = document.querySelector('[role="dialog"]') as HTMLElement;
    if (modalElement) {
      modalElement.focus();
    }

    return (): void => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleContentClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-2 sm:p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        onClick={handleContentClick}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>
        )}
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
