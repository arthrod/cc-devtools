/**
 * Terminal Context Menu
 *
 * Custom right-click context menu for terminal operations.
 * Provides Copy, Select All, Paste, and Font Size control.
 *
 * Uses viewport-aware positioning to prevent menu overflow.
 * On mobile, renders as a bottom drawer. On desktop, renders as a popover.
 */

import { useEffect, useRef, useState } from 'react';
import type { Terminal } from '@xterm/xterm';
import { adjustPositionToViewport } from '../../../utils/positioning';
import { TerminalContextMenuContent } from './TerminalContextMenuContent';
import { MobileDrawer } from './MobileDrawer';

export interface TerminalContextMenuProps {
  /**
   * Mouse X position for menu placement
   */
  x: number;

  /**
   * Mouse Y position for menu placement
   */
  y: number;

  /**
   * Terminal instance for operations
   */
  terminal: Terminal;

  /**
   * Whether text is currently selected
   */
  hasSelection: boolean;

  /**
   * Current font size
   */
  fontSize: number;

  /**
   * Callback when font size changes
   */
  onFontSizeChange: (size: number) => void;

  /**
   * Callback to close the menu
   */
  onClose: () => void;

  /**
   * Whether to render in mobile mode (as drawer)
   */
  mobileMode?: boolean;

  /**
   * Whether scroll lock is enabled (mobile only)
   */
  scrollLockEnabled?: boolean;

  /**
   * Callback when scroll lock is toggled (mobile only)
   */
  onToggleScrollLock?: () => void;
}

/**
 * TerminalContextMenu component
 */
export function TerminalContextMenu({
  x,
  y,
  terminal,
  hasSelection,
  fontSize,
  onFontSizeChange,
  onClose,
  mobileMode = false,
  scrollLockEnabled = false,
  onToggleScrollLock,
}: TerminalContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // Adjust position to stay within viewport bounds (desktop only)
  useEffect(() => {
    if (!mobileMode && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const adjusted = adjustPositionToViewport(x, y, rect);
      setAdjustedPosition({ x: adjusted.x, y: adjusted.y });
    }
  }, [x, y, mobileMode]);

  // Close menu on outside click or Escape key (desktop only)
  useEffect(() => {
    if (mobileMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, mobileMode]);

  // Mobile: render as drawer
  if (mobileMode) {
    return (
      <MobileDrawer visible={true} onClose={onClose} title="Terminal Options">
        <TerminalContextMenuContent
          terminal={terminal}
          hasSelection={hasSelection}
          fontSize={fontSize}
          onFontSizeChange={onFontSizeChange}
          onClose={onClose}
          mobileMode={true}
          scrollLockEnabled={scrollLockEnabled}
          onToggleScrollLock={onToggleScrollLock}
        />
      </MobileDrawer>
    );
  }

  // Desktop: render as popover
  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg min-w-[150px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <TerminalContextMenuContent
        terminal={terminal}
        hasSelection={hasSelection}
        fontSize={fontSize}
        onFontSizeChange={onFontSizeChange}
        onClose={onClose}
        mobileMode={false}
      />
    </div>
  );
}
