/**
 * DesktopFabButtons Component
 *
 * Floating action buttons for desktop users.
 * Provides quick access to keyboard and scroll lock controls.
 *
 * Features:
 * - Hover-reveal animation (appears on mouse hover near corner)
 * - Multiple action buttons (keyboard, scroll lock)
 * - Salmon branding
 * - Positioned in bottom-right corner
 */

import { useState, useEffect } from 'react';

export interface DesktopFabButtonsProps {
  /**
   * Callback when keyboard toggle is clicked
   */
  onToggleKeyboard: () => void;

  /**
   * Whether keyboard is currently visible
   */
  keyboardVisible: boolean;

  /**
   * Callback when scroll lock toggle is clicked
   */
  onToggleScrollLock: () => void;

  /**
   * Whether scroll lock is currently enabled
   */
  scrollLockEnabled: boolean;

  /**
   * Position of buttons (default: bottom-right)
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * Only show on desktop (hide on mobile)
   */
  onlyDesktop?: boolean;
}

interface FabButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  isHovered: boolean;
}

function FabButton({ icon, label, active, onClick, isHovered }: FabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center justify-center
        w-12 h-12
        rounded-full
        shadow-lg
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${active ? 'bg-white dark:bg-gray-800' : 'bg-white/90 dark:bg-gray-800/90'}
        backdrop-blur-sm
        ${isHovered || active ? 'opacity-100 scale-110' : 'opacity-10 scale-100'}
      `}
      style={{
        color: isHovered || active ? '#f16b5a' : '#6b7280',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: isHovered || active ? '#f16b5a' : 'transparent',
      }}
      title={label}
      aria-label={label}
    >
      <span className="text-2xl select-none">{icon}</span>
    </button>
  );
}

/**
 * DesktopFabButtons - Floating action buttons for desktop terminal controls
 */
export function DesktopFabButtons({
  onToggleKeyboard,
  keyboardVisible,
  onToggleScrollLock,
  scrollLockEnabled,
  position = 'bottom-right',
  onlyDesktop = true,
}: DesktopFabButtonsProps) {
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

  if (onlyDesktop && isMobile) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const buttons = [
    {
      icon: '🔒',
      label: scrollLockEnabled ? 'Unlock scroll (allow manual scrolling)' : 'Lock to bottom (prevent scroll jumps)',
      active: scrollLockEnabled,
      onClick: onToggleScrollLock,
    },
    {
      icon: '⌨️',
      label: 'Toggle Keyboard (Ctrl+` / Cmd+`)',
      active: keyboardVisible,
      onClick: onToggleKeyboard,
    },
  ];

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 pointer-events-auto`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col gap-3">
        {buttons.map((button, index) => (
          <div key={index} className="relative">
            <FabButton
              icon={button.icon}
              label={button.label}
              active={button.active}
              onClick={button.onClick}
              isHovered={isHovered}
            />

            {isHovered && !button.active && (
              <div
                className="absolute whitespace-nowrap px-3 py-1.5 text-sm font-medium
                           bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
                           rounded-md shadow-lg pointer-events-none
                           transition-opacity duration-150"
                style={{
                  right: position.endsWith('right') ? 'calc(100% + 0.5rem)' : undefined,
                  left: position.endsWith('left') ? 'calc(100% + 0.5rem)' : undefined,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                {button.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
