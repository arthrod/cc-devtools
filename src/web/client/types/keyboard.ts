/**
 * Keyboard shortcut definition with cross-platform modifier support.
 *
 * Defines key combinations with modifier support.
 * Meta key is Command on macOS, Windows key on Windows/Linux.
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description?: string;
  disabled?: boolean;
}

/**
 * Keyboard shortcut category for help display organization.
 */
export interface ShortcutCategory {
  category: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}
