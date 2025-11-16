/**
 * Scroll Pause Indicator Component
 *
 * Displays a badge when auto-scroll is paused (user scrolled up from bottom).
 * Shows the number of lines between current scroll position and bottom.
 */

import React from 'react';

/**
 * ScrollPauseIndicator props
 */
export interface ScrollPauseIndicatorProps {
  /** Whether the indicator is visible (auto-scroll paused) */
  visible: boolean;

  /** Number of lines from current position to bottom */
  lineCount: number;

  /** Callback when user clicks to resume auto-scroll */
  onResume?: () => void;

  /** Whether scroll lock is enabled */
  scrollLockEnabled?: boolean;

  /** Callback when scroll lock toggle is clicked */
  onToggleScrollLock?: () => void;

  /** Always show scroll lock toggle (for mobile) */
  alwaysShowScrollLock?: boolean;
}

/**
 * ScrollPauseIndicator component
 *
 * Shows "Paused ↑N lines" badge when auto-scroll is paused.
 * Clicking the badge scrolls to bottom and resumes auto-scroll.
 *
 * @example
 * ```tsx
 * const [isPaused, setIsPaused] = useState(false);
 * const [linesFromBottom, setLinesFromBottom] = useState(0);
 *
 * return (
 *   <div>
 *     <ScrollPauseIndicator
 *       visible={isPaused}
 *       lineCount={linesFromBottom}
 *       onResume={() => {
 *         scrollToBottom();
 *         setIsPaused(false);
 *       }}
 *     />
 *   </div>
 * );
 * ```
 */
export const ScrollPauseIndicator: React.FC<ScrollPauseIndicatorProps> = ({
  visible,
  lineCount,
  onResume,
  scrollLockEnabled = false,
  onToggleScrollLock,
  alwaysShowScrollLock = false,
}) => {
  if (!visible && !scrollLockEnabled && !alwaysShowScrollLock) {
    return null;
  }

  return (
    <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
      <div className="flex items-center gap-2">
        {/* Resume button (only when paused) */}
        {visible && (
          <button
            type="button"
            onClick={onResume}
            className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl dark:bg-gray-800/90 dark:text-gray-200 dark:hover:bg-gray-800"
            aria-label={`Auto-scroll paused. ${lineCount} lines from bottom. Click to resume.`}
            style={{
              borderLeft: '3px solid #f16b5a',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Pause icon */}
              <rect x="4" y="3" width="3" height="10" />
              <rect x="9" y="3" width="3" height="10" />
            </svg>

            <span>
              Paused <span className="font-semibold">↑{lineCount}</span> lines
            </span>

            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#f16b5a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Down arrow icon */}
              <line x1="8" y1="3" x2="8" y2="13" />
              <polyline points="4 9 8 13 12 9" />
            </svg>
          </button>
        )}

        {/* Scroll lock toggle */}
        {onToggleScrollLock && (
          <button
            type="button"
            onClick={onToggleScrollLock}
            className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl dark:bg-gray-800/90 dark:text-gray-200 dark:hover:bg-gray-800"
            aria-label={scrollLockEnabled ? 'Unlock scroll (allow manual scrolling)' : 'Lock to bottom (prevent scroll jumps)'}
            style={{
              borderLeft: scrollLockEnabled ? '3px solid #f16b5a' : '3px solid #6b7280',
            }}
          >
            <span className="text-base select-none">{scrollLockEnabled ? '🔒' : '🔓'}</span>
            <span>{scrollLockEnabled ? 'Locked' : 'Lock'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
