/**
 * TerminalContextMenuContent Component
 *
 * Shared content for terminal context menu.
 * Can be rendered in both desktop popover and mobile drawer.
 *
 * Features:
 * - Copy (if text is selected)
 * - Select All
 * - Paste
 * - Font Size controls
 */

import { Plus, Minus, Type } from 'lucide-react';
import type { Terminal } from '@xterm/xterm';

export interface TerminalContextMenuContentProps {
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
   * Whether rendered in mobile mode (affects styling)
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

// Font size constraints
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;

/**
 * TerminalContextMenuContent - Shared menu content
 */
export function TerminalContextMenuContent({
  terminal,
  hasSelection,
  fontSize,
  onFontSizeChange,
  onClose,
  mobileMode = false,
  scrollLockEnabled = false,
  onToggleScrollLock,
}: TerminalContextMenuContentProps) {
  const handleCopy = () => {
    if (hasSelection) {
      const selection = terminal.getSelection();
      navigator.clipboard.writeText(selection).catch((error) => {
        console.error('[TerminalContextMenuContent] Failed to copy:', error);
      });
    }
    onClose();
  };

  const handleSelectAll = () => {
    terminal.selectAll();
    onClose();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      terminal.paste(text);
    } catch (error) {
      console.error('[TerminalContextMenuContent] Failed to paste:', error);
    }
    onClose();
  };

  const handleFontSizeIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fontSize < MAX_FONT_SIZE) {
      onFontSizeChange(fontSize + 1);
    }
  };

  const handleFontSizeDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fontSize > MIN_FONT_SIZE) {
      onFontSizeChange(fontSize - 1);
    }
  };

  const buttonClass = mobileMode
    ? 'w-full px-6 py-4 text-left text-base font-medium active:bg-gray-100 dark:active:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors'
    : 'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100';

  const disabledClass = mobileMode
    ? 'text-gray-400 dark:text-gray-600'
    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed';

  const handleScrollLockToggle = () => {
    onToggleScrollLock?.();
  };

  return (
    <div className={mobileMode ? 'py-2' : 'py-1'}>
      {/* Scroll Lock (mobile only, top option) */}
      {mobileMode && onToggleScrollLock && (
        <>
          <button onClick={handleScrollLockToggle} className={buttonClass}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{scrollLockEnabled ? '🔒' : '🔓'}</span>
              <div className="flex-1">
                <div className="font-semibold">{scrollLockEnabled ? 'Scroll Locked' : 'Scroll Unlocked'}</div>
                <div className="text-xs opacity-70">
                  {scrollLockEnabled ? 'Tap to allow manual scrolling' : 'Tap to prevent scroll jumps'}
                </div>
              </div>
            </div>
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
        </>
      )}

      {/* Copy */}
      <button
        onClick={handleCopy}
        disabled={!hasSelection}
        className={`${buttonClass} ${!hasSelection ? disabledClass : ''}`}
      >
        Copy
      </button>

      {/* Select All */}
      <button onClick={handleSelectAll} className={buttonClass}>
        Select All
      </button>

      {/* Paste */}
      <button onClick={handlePaste} className={buttonClass}>
        Paste
      </button>

      {/* Divider */}
      <div className={`border-t border-gray-200 dark:border-gray-700 ${mobileMode ? 'my-2' : 'my-1'}`} />

      {/* Font Size */}
      <div
        className={`flex items-center gap-2 text-gray-900 dark:text-gray-100 ${
          mobileMode ? 'px-6 py-4 text-base' : 'px-4 py-2 text-sm'
        }`}
      >
        <Type size={mobileMode ? 20 : 14} className="flex-shrink-0" />
        <span className="flex-1">Font Size</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFontSizeDecrease}
            disabled={fontSize <= MIN_FONT_SIZE}
            className={`
              p-1 rounded transition-colors
              ${mobileMode ? 'p-2' : 'p-1'}
              ${
                fontSize <= MIN_FONT_SIZE
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500'
              }
            `}
            type="button"
            aria-label="Decrease font size"
          >
            <Minus size={mobileMode ? 20 : 14} />
          </button>
          <span className={`font-mono text-center ${mobileMode ? 'text-base w-10' : 'text-xs w-8'}`}>
            {fontSize}
          </span>
          <button
            onClick={handleFontSizeIncrease}
            disabled={fontSize >= MAX_FONT_SIZE}
            className={`
              p-1 rounded transition-colors
              ${mobileMode ? 'p-2' : 'p-1'}
              ${
                fontSize >= MAX_FONT_SIZE
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500'
              }
            `}
            type="button"
            aria-label="Increase font size"
          >
            <Plus size={mobileMode ? 20 : 14} />
          </button>
        </div>
      </div>
    </div>
  );
}
