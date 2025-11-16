import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  noPadding?: boolean;
  customContent?: boolean;
}

export function Modal({
  children,
  isOpen,
  onClose,
  title,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  noPadding = false,
  customContent = false
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

    document.body.style.overflow = 'hidden';

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

  const modalContent = (
    <div
      className={`fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${noPadding ? '' : 'p-2 sm:p-4'}`}
      onClick={handleOverlayClick}
    >
      {customContent ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          tabIndex={-1}
        >
          {children}
        </div>
      ) : (
        <div
          className="relative w-[95vw] min-w-[95vw] max-w-[95vw] h-[85vh] min-h-[85vh] max-h-[85vh] sm:w-full sm:min-w-0 sm:max-w-lg sm:h-auto sm:min-h-0 sm:max-h-full md:max-w-2xl overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-xl mx-2 sm:mx-4 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          tabIndex={-1}
        >
          {title && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            </div>
          )}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto sm:max-h-[80vh]">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
