/**
 * DesktopKeyboardButton Component
 *
 * Floating button for desktop users to access mobile keyboard.
 * Useful for testing mobile layouts or entering special keys.
 *
 * Features:
 * - Hover-reveal animation (appears on mouse hover near corner)
 * - Keyboard icon (⌨️) with salmon branding
 * - Click → show mobile keyboard in desktop mode
 * - Ctrl+K / Cmd+K global shortcut
 * - Positioned in bottom-right corner (customizable)
 */

import { useState, useEffect } from 'react';

export interface DesktopKeyboardButtonProps {
  /**
   * Callback when button is clicked or shortcut is pressed
   */
  onToggleKeyboard: () => void;

  /**
   * Whether keyboard is currently visible
   */
  keyboardVisible: boolean;

  /**
   * Position of button (default: bottom-right)
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * Only show on desktop (hide on mobile)
   */
  onlyDesktop?: boolean;
}

/**
 * DesktopKeyboardButton - Floating button to toggle mobile keyboard on desktop
 */
export function DesktopKeyboardButton({
  onToggleKeyboard,
  keyboardVisible,
  position = 'bottom-right',
  onlyDesktop = true,
}: DesktopKeyboardButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Global keyboard shortcut: Ctrl+` / Cmd+` (VS Code style terminal toggle)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+` (Windows/Linux) or Cmd+` (macOS)
      const isModifierBacktick = (event.ctrlKey || event.metaKey) && event.key === '`' && !event.shiftKey && !event.altKey;

      if (isModifierBacktick) {
        event.preventDefault();
        event.stopPropagation();
        onToggleKeyboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onToggleKeyboard]);

  // Hide button on mobile if onlyDesktop is true
  if (onlyDesktop && isMobile) {
    return null;
  }

  // Position classes based on position prop
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 pointer-events-auto`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onToggleKeyboard}
        className={`
          flex items-center justify-center
          w-12 h-12
          rounded-full
          shadow-lg
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${keyboardVisible ? 'bg-white dark:bg-gray-800' : 'bg-white/90 dark:bg-gray-800/90'}
          backdrop-blur-sm
          ${isHovered || keyboardVisible ? 'opacity-100 scale-110' : 'opacity-10 scale-100'}
        `}
        style={{
          color: isHovered || keyboardVisible ? '#f16b5a' : '#6b7280',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: isHovered || keyboardVisible ? '#f16b5a' : 'transparent',
        }}
        title="Toggle Keyboard (Ctrl+` / Cmd+`)"
        aria-label="Toggle mobile keyboard"
      >
        <span className="text-2xl select-none">⌨️</span>
      </button>

      {/* Tooltip hint (appears on hover) */}
      {isHovered && !keyboardVisible && (
        <div
          className="absolute whitespace-nowrap px-3 py-1.5 text-sm font-medium
                     bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
                     rounded-md shadow-lg pointer-events-none
                     transition-opacity duration-150"
          style={{
            bottom: position.startsWith('bottom') ? '100%' : undefined,
            top: position.startsWith('top') ? '100%' : undefined,
            right: position.endsWith('right') ? '0' : undefined,
            left: position.endsWith('left') ? '0' : undefined,
            marginBottom: position.startsWith('bottom') ? '0.5rem' : undefined,
            marginTop: position.startsWith('top') ? '0.5rem' : undefined,
          }}
        >
          Keyboard (Ctrl+`)
        </div>
      )}
    </div>
  );
}
