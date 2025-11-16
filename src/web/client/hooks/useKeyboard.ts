import { useEffect, useRef, useCallback } from 'react';
import type { KeyboardShortcut } from '../types/keyboard';

/**
 * Registers keyboard shortcuts and handles their execution with proper modifier key matching.
 * Automatically ignores shortcuts when user is typing in form elements to prevent conflicts.
 *
 * @param shortcuts Array of keyboard shortcut definitions with callbacks
 * @param enabled Whether shortcuts should be active (defaults to true)
 */
export function useKeyboard(shortcuts: KeyboardShortcut[], enabled = true): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent): void => {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    const isTyping = target.matches('input, textarea, [contenteditable="true"]');

    if (isTyping) return;

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.disabled) continue;

      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !shortcut.ctrl || event.ctrlKey;
      const metaMatches = !shortcut.meta || event.metaKey;
      const shiftMatches = !shortcut.shift || event.shiftKey;
      const altMatches = !shortcut.alt || event.altKey;

      // Prevent false matches when extra modifiers are pressed
      const hasExtraCtrl = event.ctrlKey && !shortcut.ctrl;
      const hasExtraMeta = event.metaKey && !shortcut.meta;
      const hasExtraShift = event.shiftKey && !shortcut.shift;
      const hasExtraAlt = event.altKey && !shortcut.alt;

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches &&
          !hasExtraCtrl && !hasExtraMeta && !hasExtraShift && !hasExtraAlt) {
        event.preventDefault();
        shortcut.callback();
        break;
      }
    }
  }, [enabled]);

  useEffect((): (() => void) => {
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
