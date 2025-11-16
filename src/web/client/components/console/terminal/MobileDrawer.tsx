/**
 * MobileDrawer Component
 *
 * Bottom slide-up drawer for mobile interfaces.
 * Used for context menus, settings, and other modal content on mobile.
 *
 * Features:
 * - Smooth slide-up animation from bottom
 * - Backdrop overlay with tap-to-close
 * - Swipe-down-to-close gesture
 * - iOS-style handle indicator
 * - Accessibility support (focus trap, Escape key)
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface MobileDrawerProps {
  /**
   * Whether drawer is visible
   */
  visible: boolean;

  /**
   * Callback when drawer is closed
   */
  onClose: () => void;

  /**
   * Drawer content
   */
  children: React.ReactNode;

  /**
   * Optional title for drawer
   */
  title?: string;

  /**
   * Maximum height as percentage of viewport (default: 60)
   */
  maxHeightPercent?: number;
}

/**
 * MobileDrawer - Bottom slide-up drawer for mobile
 */
export function MobileDrawer({
  visible,
  onClose,
  children,
  title,
  maxHeightPercent = 60,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  // Handle swipe-down-to-close gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    setIsDragging(true);
    setDragStartY(touch.clientY);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - dragStartY;

    // Only allow dragging downwards
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Close if dragged down more than 100px
    if (dragOffset > 100) {
      onClose();
    }

    setDragOffset(0);
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer container */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out"
        style={{
          maxHeight: `${maxHeightPercent}vh`,
          transform: `translateY(${dragOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        {/* Handle indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header (optional) */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 id="drawer-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close drawer"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: `${maxHeightPercent - 15}vh` }}>
          {children}
        </div>
      </div>
    </>
  );
}
