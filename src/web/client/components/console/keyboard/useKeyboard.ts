/**
 * useKeyboard Hook
 *
 * React hook for managing desktop keyboard input in terminal.
 * Handles keyboard event lifecycle with cleanup.
 */

import { useEffect, useRef } from 'react';
import type { KeyboardInputEvent } from '@/web/shared/types/console';
import { KeyboardHandler, type KeyboardHandlerConfig } from './keyboardHandler';

export interface UseKeyboardOptions {
  /**
   * Target element to attach keyboard listener (default: window)
   */
  target?: HTMLElement | Window;

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
 * Hook for managing desktop keyboard input
 */
export function useKeyboard(options: UseKeyboardOptions): void {
  const {
    target = window,
    onKeyPress,
    onEscape,
    onPaste,
    enabled = true,
  } = options;

  const handlerRef = useRef<KeyboardHandler | null>(null);

  useEffect(() => {
    const config: KeyboardHandlerConfig = {
      target,
      onKeyPress,
      onEscape,
      onPaste,
      enabled,
    };

    const handler = new KeyboardHandler(config);
    handler.attach();
    handlerRef.current = handler;

    // Cleanup on unmount
    return () => {
      handler.detach();
      handlerRef.current = null;
    };
  }, [target, onKeyPress, onEscape, onPaste, enabled]);
}
