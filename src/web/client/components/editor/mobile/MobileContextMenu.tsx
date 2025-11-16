/**
 * Mobile context menu for editor actions (copy, paste, search, etc.)
 *
 * Uses viewport-aware positioning to prevent menu overflow.
 */

import React, { useEffect, useRef } from 'react';
import { Copy, Scissors, Clipboard, Search, FileText, MousePointer } from 'lucide-react';
import { Button } from '../../shared/Button';
import { adjustPositionWithDimensions } from '../../../utils/positioning';

interface MobileContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onSearch?: () => void;
  onToggleWordWrap?: () => void;
  hasSelection?: boolean;
  canPaste?: boolean;
  wordWrap?: boolean;
  readonly?: boolean;
}

export const MobileContextMenu: React.FC<MobileContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onSearch,
  onToggleWordWrap,
  hasSelection = false,
  canPaste = false,
  wordWrap = true,
  readonly = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleAction = (action: (() => void) | undefined): (() => void) => {
    return () => {
      action?.();
      onClose();
    };
  };

  if (!isOpen) return null;

  // Calculate menu position to ensure it stays on screen
  const menuWidth = 200;
  const menuHeight = 280;

  // Use shared positioning utility with flip behavior
  const adjusted = adjustPositionWithDimensions(
    position.x,
    position.y,
    menuWidth,
    menuHeight,
    {
      margin: 10,
      flipVertical: true,
      originalPosition: position,
    }
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px]"
        style={{
          left: adjusted.x,
          top: adjusted.y,
          transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
        }}
      >
        {/* Selection Actions */}
        {hasSelection && (
          <>
            <Button
              variant="ghost"
              onClick={handleAction(onCopy)}
              className="w-full flex items-center gap-3 px-4 py-3 justify-start h-auto rounded-none"
            >
              <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm">Copy</span>
            </Button>

            {!readonly && (
              <Button
                variant="ghost"
                onClick={handleAction(onCut)}
                className="w-full flex items-center gap-3 px-4 py-3 justify-start h-auto rounded-none"
              >
                <Scissors className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm">Cut</span>
              </Button>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
          </>
        )}

        {/* Paste Action */}
        {!readonly && canPaste && (
          <>
            <Button
              variant="ghost"
              onClick={handleAction(onPaste)}
              className="w-full flex items-center gap-3 px-4 py-3 justify-start h-auto rounded-none"
            >
              <Clipboard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm">Paste</span>
            </Button>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
          </>
        )}

        {/* Select All */}
        <Button
          variant="ghost"
          onClick={handleAction(onSelectAll)}
          className="w-full flex items-center gap-3 px-4 py-3 justify-start h-auto rounded-none"
        >
          <MousePointer className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm">Select All</span>
        </Button>

        {/* Search */}
        <Button
          variant="ghost"
          onClick={handleAction(onSearch)}
          className="w-full flex items-center gap-3 px-4 py-3 justify-start h-auto rounded-none"
        >
          <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm">Find in File</span>
        </Button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

        {/* View Options */}
        <Button
          variant="ghost"
          onClick={handleAction(onToggleWordWrap)}
          className="w-full flex items-center gap-3 px-4 py-3 justify-start h-auto rounded-none"
        >
          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm">
            {wordWrap ? 'Disable' : 'Enable'} Word Wrap
          </span>
        </Button>
      </div>
    </>
  );
};
