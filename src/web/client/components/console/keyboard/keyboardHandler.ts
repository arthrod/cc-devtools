/**
 * Keyboard Handler
 *
 * Desktop keyboard event handler for terminal.
 * Captures most keys while whitelisting critical browser shortcuts.
 *
 * Features:
 * - Captures keydown events for terminal input
 * - Whitelists browser shortcuts (Ctrl+T, Ctrl+W, etc.)
 * - Esc key blurs terminal (returns focus to browser)
 * - Paste support via Ctrl+Shift+V / Cmd+V
 */

import type { KeyboardInputEvent } from '@/web/shared/types/console';

/**
 * Browser shortcuts that should NOT be captured (go to browser)
 */
const BROWSER_SHORTCUTS = new Set([
  // New tab
  'Control+t',
  'Meta+t',

  // Close tab
  'Control+w',
  'Meta+w',

  // New window
  'Control+n',
  'Meta+n',

  // Reopen closed tab
  'Control+Shift+t',
  'Meta+Shift+t',

  // Refresh
  'Control+r',
  'Meta+r',
  'Control+Shift+r',
  'Meta+Shift+r',

  // Fullscreen
  'F11',

  // Quit browser (macOS)
  'Meta+q',

  // Address bar
  'Control+l',
  'Meta+l',

  // Find
  'Control+f',
  'Meta+f',

  // Developer tools
  'Control+Shift+i',
  'Meta+Alt+i',
  'F12',

  // View source
  'Control+u',
  'Meta+u',

  // Bookmarks
  'Control+d',
  'Meta+d',

  // History
  'Control+h',
  'Meta+h',

  // Downloads
  'Control+j',
  'Meta+j',
]);

/**
 * Get keyboard shortcut key combination string
 */
function getShortcutKey(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');

  parts.push(event.key);

  return parts.join('+');
}

/**
 * Check if keyboard event is a browser shortcut
 */
export function isBrowserShortcut(event: KeyboardEvent): boolean {
  const shortcut = getShortcutKey(event);
  return BROWSER_SHORTCUTS.has(shortcut);
}

/**
 * Check if keyboard event is the Escape key
 */
export function isEscapeKey(event: KeyboardEvent): boolean {
  return event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;
}

/**
 * Check if keyboard event is a paste shortcut
 */
export function isPasteShortcut(event: KeyboardEvent): boolean {
  // Ctrl+Shift+V (Linux/Windows terminal paste)
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') {
    return true;
  }

  // Cmd+V (macOS paste)
  if (event.metaKey && !event.shiftKey && event.key.toLowerCase() === 'v') {
    return true;
  }

  return false;
}

/**
 * Convert KeyboardEvent to KeyboardInputEvent
 */
export function keyboardEventToInputEvent(event: KeyboardEvent): KeyboardInputEvent {
  return {
    key: event.key,
    modifiers: {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    },
    special: event.key.length > 1, // Arrow keys, Enter, Tab, etc.
  };
}

export interface KeyboardHandlerConfig {
  /**
   * Target element to attach keyboard listener
   */
  target: HTMLElement | Window;

  /**
   * Callback when key is pressed
   */
  onKeyPress: (event: KeyboardInputEvent) => void;

  /**
   * Callback when Escape key is pressed (blur terminal)
   */
  onEscape?: () => void;

  /**
   * Callback when paste shortcut is pressed
   */
  onPaste?: () => void;

  /**
   * Whether to enable keyboard capture (default: true)
   */
  enabled?: boolean;
}

/**
 * Keyboard handler for terminal
 */
export class KeyboardHandler {
  private config: KeyboardHandlerConfig;
  private handleKeyDown: (event: KeyboardEvent) => void;

  constructor(config: KeyboardHandlerConfig) {
    this.config = { enabled: true, ...config };

    this.handleKeyDown = (event: KeyboardEvent) => {
      if (!this.config.enabled) {
        return;
      }

      // Check for Escape key (blur terminal)
      if (isEscapeKey(event)) {
        event.preventDefault();
        this.config.onEscape?.();
        return;
      }

      // Check for browser shortcuts (let them through)
      if (isBrowserShortcut(event)) {
        return;
      }

      // Check for paste shortcut
      if (isPasteShortcut(event)) {
        event.preventDefault();
        this.config.onPaste?.();
        return;
      }

      // Ignore pure modifier keys (Shift, Control, Alt, Meta by themselves)
      if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') {
        return;
      }

      // Capture all other keys
      event.preventDefault();
      const inputEvent = keyboardEventToInputEvent(event);
      this.config.onKeyPress(inputEvent);
    };
  }

  /**
   * Attach keyboard listener
   */
  public attach(): void {
    this.config.target.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Detach keyboard listener
   */
  public detach(): void {
    this.config.target.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Enable keyboard capture
   */
  public enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable keyboard capture
   */
  public disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if keyboard capture is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled ?? true;
  }
}
