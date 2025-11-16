/**
 * CustomTerminal Component
 *
 * React component that renders a terminal using xterm.js with salmon branding.
 * Replaces VibeTunnel's <session-view> web component with custom implementation.
 *
 * Features:
 * - Salmon-branded themes (light/dark)
 * - Responsive sizing with FitAddon
 * - Clickable URLs with WebLinksAddon
 * - Fira Code font with programming ligatures
 * - WebSocket integration for I/O
 * - Mobile on-screen keyboard
 * - Desktop keyboard capture
 * - Touch gestures (swipe for arrows, 2-finger scroll, double-tap for Enter)
 * - Auto-scroll pause/resume
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

import { useAppStore } from '../../../stores/appStore';
import { useTerminalWebSocket } from '../websocket/useTerminalWebSocket';
import { getXtermTheme } from './terminalThemes';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { TerminalContextMenu } from './TerminalContextMenu';
import { MobileKeyboard } from '../keyboard/MobileKeyboard';
import { DesktopFabButtons } from '../keyboard/DesktopFabButtons';
import { useKeyboard } from '../keyboard/useKeyboard';
import { useGestures } from '../gestures/useGestures';
import { GestureFeedback } from '../gestures/GestureFeedback';
import { ScrollPauseIndicator } from '../gestures/ScrollPauseIndicator';
import { GestureDirection } from '../gestures/gestureConfig';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { getAuthToken } from '../../../services/api.service';
import { fetchTerminalBuffer, bufferSnapshotToText } from '../../../services/terminalBufferService';
import type { KeyboardInputEvent } from '@/web/shared/types/console';
import { OperationQueue } from './operationQueue';
import { ScrollManager } from './scrollManager';
import { CustomRenderer } from './customRenderer';

export interface CustomTerminalProps {
  /**
   * Session ID to connect to
   */
  sessionId: string;

  /**
   * Callback when terminal is ready
   */
  onTerminalReady?: () => void;

  /**
   * Callback when user types in terminal
   */
  onTerminalInput?: (input: string) => void;

  /**
   * Callback when terminal is resized
   */
  onTerminalResize?: (size: { cols: number; rows: number }) => void;
}

/**
 * Restore terminal buffer from backend
 *
 * Fetches the terminal buffer snapshot from VibeTunnel and writes it to xterm.js.
 * This restores scrollback history when remounting terminals.
 *
 * @param terminal - xterm.js Terminal instance
 * @param sessionId - Session ID to restore buffer for
 * @param bufferRestoredRef - Ref to track buffer restoration status
 * @param pendingOutputRef - Ref to queued WebSocket output
 */
async function restoreTerminalBuffer(
  terminal: Terminal,
  sessionId: string,
  bufferRestoredRef: React.MutableRefObject<boolean>,
  pendingOutputRef: React.MutableRefObject<string[]>
): Promise<void> {
  // Prevent multiple simultaneous buffer restorations (React StrictMode double-invoke)
  if (bufferRestoredRef.current) {
    console.log('[CustomTerminal] Buffer already restored, skipping');
    return;
  }

  try {
    console.log(`[CustomTerminal] Fetching buffer for session ${sessionId}...`);

    // Fetch buffer snapshot from backend
    const snapshot = await fetchTerminalBuffer(sessionId);

    // Double-check we haven't been restored while fetching
    if (bufferRestoredRef.current) {
      console.log('[CustomTerminal] Buffer was restored during fetch, skipping');
      return;
    }

    console.log(`[CustomTerminal] Buffer fetched: ${snapshot.cols}x${snapshot.rows}, cursor at (${snapshot.cursorX},${snapshot.cursorY})`);

    // Convert buffer to text
    const bufferText = bufferSnapshotToText(snapshot);

    // Clear terminal before restoring
    terminal.clear();

    // Write buffer to terminal
    terminal.write(bufferText);

    console.log(`[CustomTerminal] Buffer restored successfully (${bufferText.length} characters)`);

    // Mark buffer as restored
    bufferRestoredRef.current = true;

    // Flush any queued WebSocket output
    if (pendingOutputRef.current.length > 0) {
      console.log(`[CustomTerminal] Flushing ${pendingOutputRef.current.length} queued outputs`);
      for (const data of pendingOutputRef.current) {
        terminal.write(data);
      }
      pendingOutputRef.current = [];
    }
  } catch (error) {
    // Buffer restore is best-effort - don't fail if it doesn't work
    // (e.g., new session may not have buffer yet)
    console.warn('[CustomTerminal] Failed to restore buffer:', error);

    // Even if restore fails, mark as "restored" so WebSocket output flows through
    bufferRestoredRef.current = true;

    // Flush queued output
    if (pendingOutputRef.current.length > 0) {
      console.log(`[CustomTerminal] Flushing ${pendingOutputRef.current.length} queued outputs (after restore failure)`);
      for (const data of pendingOutputRef.current) {
        terminal.write(data);
      }
      pendingOutputRef.current = [];
    }
  }
}

/**
 * Convert KeyboardInputEvent to terminal input string
 *
 * Handles:
 * - Regular text characters
 * - Special keys (arrows, Enter, Escape, etc.)
 * - Modifier key combinations (Ctrl+C, Alt+B, etc.)
 */
function keyboardInputToTerminalString(event: KeyboardInputEvent): string {
  const { key, modifiers, special } = event;

  // Handle Ctrl+key combinations (send as control characters)
  if (modifiers.ctrl && !modifiers.alt && !modifiers.meta && key.length === 1) {
    const char = key.toLowerCase();
    const code = char.charCodeAt(0);

    // Ctrl+A = 0x01, Ctrl+B = 0x02, ..., Ctrl+Z = 0x1A
    if (code >= 97 && code <= 122) {
      const ctrlCode = code - 96; // 'a' (97) -> 1, 'b' (98) -> 2, etc.
      return String.fromCharCode(ctrlCode);
    }
  }

  // Handle special keys (arrows, Enter, Escape, Tab, etc.)
  if (special) {
    // Map key names to terminal escape sequences
    const specialKeyMap: Record<string, string> = {
      'Enter': '\r',
      'Backspace': '\x7f',
      'Tab': '\t',
      'Escape': '\x1b',
      'ArrowUp': '\x1b[A',
      'ArrowDown': '\x1b[B',
      'ArrowRight': '\x1b[C',
      'ArrowLeft': '\x1b[D',
      'Home': '\x1b[H',
      'End': '\x1b[F',
      'PageUp': '\x1b[5~',
      'PageDown': '\x1b[6~',
      'Insert': '\x1b[2~',
      'Delete': '\x1b[3~',
      'F1': '\x1bOP',
      'F2': '\x1bOQ',
      'F3': '\x1bOR',
      'F4': '\x1bOS',
      'F5': '\x1b[15~',
      'F6': '\x1b[17~',
      'F7': '\x1b[18~',
      'F8': '\x1b[19~',
      'F9': '\x1b[20~',
      'F10': '\x1b[21~',
      'F11': '\x1b[23~',
      'F12': '\x1b[24~',
    };

    return specialKeyMap[key] ?? key;
  }

  // Handle Alt+key combinations (send as escape + key)
  if (modifiers.alt && !modifiers.ctrl && !modifiers.meta) {
    return `\x1b${key}`;
  }

  // Regular character (including Shift modifier for uppercase)
  return key;
}

/**
 * CustomTerminal - xterm.js-based terminal with WebSocket connectivity
 */
export function CustomTerminal({
  sessionId,
  onTerminalReady,
  onTerminalInput,
  onTerminalResize,
}: CustomTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const darkMode = useAppStore((state) => state.darkMode);
  const addToast = useAppStore((state) => state.addToast);


  // Refs for functions that change frequently (to avoid recreating gesture handlers)
  const sendInputRef = useRef<((data: string) => void) | null>(null);
  const onTerminalInputRef = useRef<((input: string) => void) | undefined>(onTerminalInput);

  // Mobile keyboard state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const isMobile = useIsMobile();

  // Xterm.js screen element state (for gesture attachment on mobile)
  const [xtermScreenElement, setXtermScreenElement] = useState<HTMLElement | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; hasSelection: boolean } | null>(null);

  // Font size state (persisted to localStorage)
  const [fontSize, setFontSize] = useState<number>(() => {
    const savedSize = localStorage.getItem('terminal-font-size');
    const defaultSize = window.innerWidth < 768 ? 16 : 14; // Mobile: 16px, Desktop: 14px
    return savedSize ? parseInt(savedSize, 10) : defaultSize;
  });

  // Scroll lock state (persisted to localStorage)
  const [scrollLockEnabled, setScrollLockEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('terminal-scroll-lock');
    return saved === 'true';
  });

  // Auto-scroll state (simplified follow-cursor approach)
  const [followCursorEnabled, setFollowCursorEnabled] = useState(true);
  const programmaticScrollRef = useRef(false);

  // Scroll position caching (prevents stale buffer.viewportY queries)
  const scrollStateRef = useRef({ isAtBottom: true, lastBufferHeight: 0 });

  // Custom scroll state for new architecture (Phase 1.1)
  const viewportYRef = useRef(0); // Pixel-based scroll position
  const renderPendingRef = useRef(false); // Render scheduled flag
  const operationQueueRef = useRef<Array<() => void | Promise<void>>>([]);

  // New architecture instances (Phase 3.1)
  const operationQueueInstance = useRef<OperationQueue | null>(null);
  const scrollManagerInstance = useRef<ScrollManager | null>(null);
  const rendererInstance = useRef<CustomRenderer | null>(null);

  // WebSocket output batching (performance optimization for rapid output)
  const outputBatchRef = useRef<string>('');
  const batchTimeoutRef = useRef<number | null>(null);
  const followCursorRequestedRef = useRef(false);
  const BATCH_DELAY = 16; // ~60fps batching

  // Terminal dimensions state (for backend resize notifications)
  const [terminalDimensions, setTerminalDimensions] = useState<{ cols: number; rows: number } | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  // Buffer restoration state - prevents WebSocket output duplication
  const bufferRestoredRef = useRef(false);
  const pendingOutputRef = useRef<string[]>([]);

  // Follow cursor to keep it visible (VibeTunnel approach with cached state optimization)
  const followCursor = useCallback(() => {
    const terminal = xtermRef.current;
    if (!terminal) return;

    // Skip if we're not at bottom (trust cached state to avoid querying stale buffer)
    if (!scrollStateRef.current.isAtBottom) return;

    const buffer = terminal.buffer.active;
    const cursorY = buffer.cursorY + buffer.viewportY; // Absolute cursor position in buffer

    // Get current viewport in buffer coordinates
    const viewportY = buffer.viewportY;
    const viewportStartLine = viewportY;
    const viewportEndLine = viewportY + terminal.rows - 1;

    // Only scroll if cursor is outside viewport
    if (cursorY < viewportStartLine || cursorY > viewportEndLine) {
      // Set flag to prevent state updates during programmatic scrolling
      programmaticScrollRef.current = true;

      // Scroll to keep cursor visible
      // Note: xterm.js will handle the actual scrolling via buffer.viewportY
      if (cursorY < viewportStartLine) {
        // Cursor above viewport - scroll up to show it
        terminal.scrollLines(-(viewportStartLine - cursorY));
      } else {
        // Cursor below viewport - scroll down to show it at bottom
        terminal.scrollLines(cursorY - viewportEndLine);
      }

      programmaticScrollRef.current = false;
    }
  }, []);

  // Throttled followCursor using RAF (prevents excessive scroll operations)
  const followCursorThrottled = useCallback(() => {
    if (followCursorRequestedRef.current) return; // Already scheduled

    followCursorRequestedRef.current = true;
    requestAnimationFrame(() => {
      followCursorRequestedRef.current = false;
      followCursor();
    });
  }, [followCursor]);

  // Flush batched output (write accumulated data to terminal)
  const flushOutputBatch = useCallback(() => {
    const terminal = xtermRef.current;
    if (!terminal || !outputBatchRef.current) {
      batchTimeoutRef.current = null;
      return;
    }

    // Write batched data
    terminal.write(outputBatchRef.current);
    outputBatchRef.current = '';
    batchTimeoutRef.current = null;

    // Follow cursor if enabled (throttled)
    if (followCursorEnabled) {
      followCursorThrottled();
    }
  }, [followCursorEnabled, followCursorThrottled]);

  // Add to output batch (accumulates WebSocket messages for batched writing)
  const addToOutputBatch = useCallback((data: string) => {
    outputBatchRef.current += data;

    // Schedule flush if not already scheduled
    if (batchTimeoutRef.current === null) {
      batchTimeoutRef.current = window.setTimeout(flushOutputBatch, BATCH_DELAY);
    }
  }, [flushOutputBatch]);

  // WebSocket connection for terminal I/O
  const { sendInput, status, connect } = useTerminalWebSocket({
    sessionId,
    onOutput: (data) => {
      // Queue output until buffer is restored to prevent duplication
      if (!bufferRestoredRef.current) {
        pendingOutputRef.current.push(data);
        return;
      }

      // Use operation queue for coordinated writes (Phase 3.1)
      operationQueueInstance.current?.enqueue(async () => {
        const terminal = xtermRef.current;
        const scrollManager = scrollManagerInstance.current;
        const renderer = rendererInstance.current;

        if (!terminal || !renderer || !scrollManager) return;

        // Write to xterm.js buffer (for data model)
        await new Promise<void>((resolve) => {
          terminal.write(data, resolve);
        });

        // If scroll lock is enabled, force scroll to bottom in xterm.js
        if (scrollManager.isScrollLockEnabled()) {
          const buffer = terminal.buffer.active;
          const maxScroll = Math.max(0, buffer.length - terminal.rows);
          terminal.scrollToLine(maxScroll);
        }

        // Follow cursor if enabled (updates viewportY based on new buffer length)
        if (scrollManager.isFollowCursorEnabled()) {
          const lineHeight = fontSize * 1.2;
          scrollManager.followCursor(terminal, lineHeight, terminal.rows);
        }

        // Render with final scroll position (after followCursor updated viewportY)
        renderer.render(scrollManager.getViewportY(), terminal.rows);
      });
    },
    onError: (error) => {
      console.error('[CustomTerminal] WebSocket error:', error);

      // Queue error messages too (Phase 3.1)
      operationQueueInstance.current?.enqueue(() => {
        xtermRef.current?.write(`\r\n\x1b[31mConnection error: ${error.message}\x1b[0m\r\n`);
      });
    },
  });

  // Update refs when functions change
  useEffect(() => {
    sendInputRef.current = sendInput;
    onTerminalInputRef.current = onTerminalInput;
  }, [sendInput, onTerminalInput]);

  // Handle keyboard input from both mobile and desktop keyboards
  const handleKeyboardInput = useCallback(
    (event: KeyboardInputEvent) => {
      const terminalInput = keyboardInputToTerminalString(event);
      sendInput(terminalInput);
      onTerminalInput?.(terminalInput);
    },
    [sendInput, onTerminalInput]
  );

  // Desktop keyboard handler disabled - using xterm.js's built-in keyboard handling instead
  // (VibeTunnel's proven approach)
  useKeyboard({
    onKeyPress: handleKeyboardInput,
    onEscape: () => {
      // Blur terminal on Escape
      if (terminalRef.current) {
        terminalRef.current.blur();
      }
    },
    onPaste: async () => {
      // Handle paste from clipboard
      try {
        const text = await navigator.clipboard.readText();
        sendInput(text);
        onTerminalInput?.(text);
      } catch (error) {
        console.error('[CustomTerminal] Failed to read clipboard:', error);
      }
    },
    enabled: false, // Disabled - xterm.js handles keyboard natively
  });

  // Gesture handlers (use refs to avoid recreating on every render)
  // Swipe gesture disabled - was sending arrow keys which interfered with scrolling
  // Note: onSwipe is not passed to useGestures to prevent visual feedback

  const handleDoubleTap = useCallback(() => {
    // Send Enter key on double-tap
    const enterKey = '\r';
    sendInputRef.current?.(enterKey);
    onTerminalInputRef.current?.(enterKey);
  }, []);

  const handleLongPress = useCallback((x: number, y: number) => {
    // Open context menu on long press (mobile)
    const hasSelection = xtermRef.current?.hasSelection() ?? false;

    setContextMenu({
      x,
      y,
      hasSelection,
    });
  }, []);

  // Update follow cursor state based on scroll position (VibeTunnel approach with caching)
  const updateFollowCursorState = useCallback(() => {
    // Don't update state during programmatic scrolling
    if (programmaticScrollRef.current) return;

    const terminal = xtermRef.current;
    if (!terminal) return;

    const buffer = terminal.buffer.active;
    const scrollPosition = buffer.viewportY;
    const bufferHeight = buffer.baseY;
    const maxScroll = Math.max(0, bufferHeight - terminal.rows);

    // Consider "at bottom" if within one line of the maximum scroll
    const isAtBottom = scrollPosition >= maxScroll - 1;

    // Cache scroll state (prevents stale queries later)
    scrollStateRef.current = { isAtBottom, lastBufferHeight: bufferHeight };

    // Update follow cursor state
    if (isAtBottom && !followCursorEnabled) {
      // User scrolled back to bottom - re-enable follow cursor
      setFollowCursorEnabled(true);
    } else if (!isAtBottom && followCursorEnabled) {
      // User scrolled away from bottom - disable follow cursor
      setFollowCursorEnabled(false);
    }
  }, [followCursorEnabled]);

  const handleScroll = useCallback(
    (deltaY: number) => {
      const terminal = xtermRef.current;
      const scrollManager = scrollManagerInstance.current;
      const renderer = rendererInstance.current;

      if (!terminal || !scrollManager || !renderer) return;

      // Convert gesture delta to pixels (Phase 3.2)
      const lineHeight = fontSize * 1.2;
      const deltaPixels = Math.sign(deltaY) * 3 * lineHeight;

      // Scroll using scroll manager
      const buffer = terminal.buffer.active;
      const scrolled = scrollManager.scrollByPixels(
        deltaPixels,
        buffer.length,
        terminal.rows,
        lineHeight
      );

      if (scrolled) {
        // Update follow cursor state
        scrollManager.updateFollowCursorState(buffer.length, terminal.rows, lineHeight);

        // Render with new scroll position
        renderer.render(scrollManager.getViewportY(), terminal.rows);
      }
    },
    [fontSize]
  );

  // Resume follow cursor (scroll to bottom)
  const resumeFollowCursor = useCallback(() => {
    const terminal = xtermRef.current;
    const scrollManager = scrollManagerInstance.current;
    const renderer = rendererInstance.current;

    if (!terminal || !scrollManager || !renderer) return;

    // Scroll to bottom using scroll manager (Phase 3.2)
    const lineHeight = fontSize * 1.2;
    scrollManager.scrollToBottom(terminal.buffer.active.length, terminal.rows, lineHeight);
    scrollManager.setFollowCursorEnabled(true);

    // Update local state to match
    setFollowCursorEnabled(true);

    // Render with new scroll position
    renderer.render(scrollManager.getViewportY(), terminal.rows);
  }, [fontSize]);

  // Handle single tap (toggle keyboard on mobile)
  // Note: We use the gesture handler's single tap instead of onClick to avoid
  // interfering with double-tap detection
  const handleSingleTap = useCallback(() => {
    // Toggle keyboard visibility
    setKeyboardVisible(prev => !prev);
  }, []);

  // Attach gestures to xterm.js screen element (mobile only)
  // Note: onSwipe is intentionally omitted to disable swipe gesture feedback
  const { feedback, handler } = useGestures({
    target: isMobile ? xtermScreenElement : null,
    onDoubleTap: handleDoubleTap,
    onSingleTap: handleSingleTap,
    onLongPress: handleLongPress,
    onScroll: handleScroll,
    enabled: isMobile,
  });




  // Initialize xterm.js terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Reset buffer restoration state on mount
    bufferRestoredRef.current = false;
    pendingOutputRef.current = [];

    // Create Terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"Fira Code", "Courier New", monospace',
      fontSize, // Use state-managed font size
      fontWeight: '400',
      fontWeightBold: '700',
      lineHeight: 1.2,
      letterSpacing: 0,
      scrollback: 10000,
      theme: getXtermTheme(darkMode ? 'dark' : 'light'),
      allowTransparency: false,
      smoothScrollDuration: 100,
      // Mobile: disable xterm.js keyboard to prevent native keyboard, use custom keyboard instead
      // Desktop: enable xterm.js keyboard for native input
      disableStdin: isMobile,
    });

    // Create and load addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in DOM
    terminal.open(terminalRef.current);

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initialize new architecture (Phase 3.1)
    operationQueueInstance.current = new OperationQueue({ maxFrameTime: 8 });
    scrollManagerInstance.current = new ScrollManager();

    // Initialize scroll lock state from component state
    scrollManagerInstance.current.setScrollLockEnabled(scrollLockEnabled);

    // Initialize custom renderer
    // Note: We'll create a container element for custom rendering
    const customRenderContainer = document.createElement('div');
    customRenderContainer.className = 'custom-terminal-render';
    customRenderContainer.style.position = 'absolute';
    customRenderContainer.style.top = '0';
    customRenderContainer.style.left = '0';
    customRenderContainer.style.width = '100%';
    customRenderContainer.style.height = '100%';
    customRenderContainer.style.pointerEvents = 'none'; // Let events pass through
    rendererInstance.current = new CustomRenderer(terminal, customRenderContainer, {
      fontSize,
      lineHeight: 1.2,
      cursorVisible: true,
    });

    // Get xterm.js screen element for gesture attachment (mobile only)
    // The .xterm-screen element is where xterm.js renders the terminal content
    if (isMobile && terminalRef.current) {
      const screenElement = terminalRef.current.querySelector('.xterm-screen') as HTMLElement;
      if (screenElement) {
        setXtermScreenElement(screenElement);
      } else {
        console.warn('[CustomTerminal] Could not find .xterm-screen element, trying fallbacks');
        // Try alternate selectors
        const viewport = terminalRef.current.querySelector('.xterm-viewport') as HTMLElement;
        const xtermElement = terminalRef.current.querySelector('.xterm') as HTMLElement;
        if (viewport) {
          setXtermScreenElement(viewport);
        } else if (xtermElement) {
          setXtermScreenElement(xtermElement);
        }
      }
    }

    // Fit terminal to container and restore buffer
    // Use requestAnimationFrame to ensure container has proper dimensions
    requestAnimationFrame(async () => {
      fitAddon.fit();
      console.log('[CustomTerminal] Initial fit completed:', {
        cols: terminal.cols,
        rows: terminal.rows,
      });

      // Send initial dimensions to backend immediately
      // (session may have been created with default 120x30 dimensions)
      setTerminalDimensions({ cols: terminal.cols, rows: terminal.rows });

      // Restore terminal buffer from backend (scrollback history)
      // WebSocket output is queued until buffer is restored to prevent duplication
      await restoreTerminalBuffer(terminal, sessionId, bufferRestoredRef, pendingOutputRef);
    });

    // Handle terminal resize
    terminal.onResize(({ cols, rows }) => {
      // Update local state to trigger backend resize notification
      setTerminalDimensions({ cols, rows });
      onTerminalResize?.({ cols, rows });
    });

    // Handle keyboard input from xterm.js (VibeTunnel's proven approach)
    terminal.onData((data) => {
      sendInput(data);
      onTerminalInput?.(data);
    });

    // Set up ResizeObserver for reliable container resize detection
    // This catches flex layout changes, CSS changes, and parent resizes
    if (terminalRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        const terminal = xtermRef.current;
        const scrollManager = scrollManagerInstance.current;
        const renderer = rendererInstance.current;
        const fitAddon = fitAddonRef.current;

        if (!terminal || !fitAddon || !scrollManager || !renderer) return;

        // Store current scroll state before resize (Phase 3.3)
        const lineHeight = fontSize * 1.2;
        const wasAtBottom = scrollManager.isScrolledToBottom(
          terminal.buffer.active.length,
          terminal.rows,
          lineHeight
        );

        // Fit terminal
        fitAddon.fit();
        console.log('[CustomTerminal] Resized via ResizeObserver:', {
          cols: terminal.cols,
          rows: terminal.rows,
        });

        // Update scroll position after resize
        if (wasAtBottom) {
          // If was at bottom, scroll to new bottom
          scrollManager.scrollToBottom(
            terminal.buffer.active.length,
            terminal.rows,
            lineHeight
          );
        }

        // Re-render with updated dimensions and scroll position
        renderer.render(scrollManager.getViewportY(), terminal.rows);
      });

      resizeObserver.observe(terminalRef.current);
      resizeObserverRef.current = resizeObserver;
    }

    // Prevent xterm.js's internal textarea from triggering iOS keyboard on mobile
    if (isMobile && terminalRef.current) {
      const textarea = terminalRef.current.querySelector('textarea');
      if (textarea) {
        // Make textarea non-focusable and non-interactive on mobile
        textarea.setAttribute('readonly', 'true');
        textarea.setAttribute('inputmode', 'none');
        textarea.style.pointerEvents = 'none';

        // Prevent focus
        textarea.addEventListener('focus', (e) => {
          e.preventDefault();
          textarea.blur();
        });
      }
    }

    // Notify that terminal is ready
    onTerminalReady?.();

    console.log('[CustomTerminal] Terminal initialized:', {
      sessionId,
      cols: terminal.cols,
      rows: terminal.rows,
      theme: darkMode ? 'dark' : 'light',
      mobileKeyboardDisabled: isMobile,
    });

    // Cleanup on unmount
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      // Cleanup batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      // Cleanup new architecture (Phase 3.1)
      if (operationQueueInstance.current) {
        operationQueueInstance.current.clear();
        operationQueueInstance.current = null;
      }
      scrollManagerInstance.current = null;
      rendererInstance.current = null;

      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, isMobile]); // Reinitialize if sessionId or mobile status changes

  // Update theme when dark mode changes
  useEffect(() => {
    if (xtermRef.current) {
      const theme = getXtermTheme(darkMode ? 'dark' : 'light');
      xtermRef.current.options.theme = theme;
      console.log('[CustomTerminal] Theme updated:', darkMode ? 'dark' : 'light');
    }
  }, [darkMode]);

  // Sync scroll lock state with ScrollManager
  useEffect(() => {
    if (scrollManagerInstance.current) {
      scrollManagerInstance.current.setScrollLockEnabled(scrollLockEnabled);
    }
  }, [scrollLockEnabled]);

  // Note: Window resize is now handled by ResizeObserver on the terminal container
  // ResizeObserver is more reliable as it detects actual container size changes
  // from flex layout, CSS changes, and parent resizes, not just window resizes

  // Auto-lock scroll to bottom when mobile keyboard becomes visible
  // Mobile users can only scroll when keyboard is hidden
  useEffect(() => {
    if (!isMobile) return;

    if (keyboardVisible) {
      // Enable scroll lock when keyboard is shown
      const scrollManager = scrollManagerInstance.current;
      const terminal = xtermRef.current;
      const renderer = rendererInstance.current;

      if (scrollManager && terminal && renderer) {
        scrollManager.setScrollLockEnabled(true);
        setScrollLockEnabled(true);
        localStorage.setItem('terminal-scroll-lock', 'true');

        // Scroll to bottom
        const lineHeight = fontSize * 1.2;
        scrollManager.scrollToBottom(terminal.buffer.active.length, terminal.rows, lineHeight);
        setFollowCursorEnabled(true);
        renderer.render(scrollManager.getViewportY(), terminal.rows);
      }
    }
  }, [keyboardVisible, isMobile, fontSize]);

  // Follow cursor when mobile keyboard visibility changes
  // This ensures cursor stays visible when keyboard is shown/hidden
  useEffect(() => {
    if (!isMobile || !xtermRef.current) return;

    // Use a small delay to allow the resize animation to complete
    // ResizeObserver will also trigger, but this ensures we follow cursor after animation
    const timeoutId = window.setTimeout(() => {
      if (followCursorEnabled) {
        followCursor();
      }
    }, 350); // Slightly longer than the 300ms CSS transition

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyboardVisible, isMobile, followCursorEnabled, followCursor]);

  // Send terminal resize events to backend PTY session
  useEffect(() => {
    if (!terminalDimensions) return;

    const { cols, rows } = terminalDimensions;

    // Debounce resize requests to prevent too many API calls
    // (ResizeObserver can fire multiple times during a single resize)
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = window.setTimeout(async () => {
      try {
        console.log(`[CustomTerminal] Sending resize to backend: ${cols}x${rows}`);

        // Call VibeTunnel's resize endpoint directly (not through apiClient)
        // VibeTunnel is mounted at '/' so endpoint is /api/sessions/:id/resize
        const token = getAuthToken();
        const response = await fetch(`/api/sessions/${sessionId}/resize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ cols, rows }),
        });

        if (!response.ok) {
          throw new Error(`Resize failed: ${response.status} ${response.statusText}`);
        }

        console.log(`[CustomTerminal] Backend PTY resized to: ${cols}x${rows}`);
      } catch (error) {
        console.error('[CustomTerminal] Failed to resize backend PTY:', error);
      }
    }, 300); // 300ms debounce

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [terminalDimensions, sessionId]);

  // Show connection status in terminal
  useEffect(() => {
    if (!xtermRef.current) return;

    if (status.connected && !status.reconnecting) {
      // Connected
      console.log('[CustomTerminal] Connected to session:', sessionId);
    } else if (status.reconnecting && status.retryCount && status.retryCount > 0) {
      // Only show reconnecting message if we're actually retrying (not initial connection)
      xtermRef.current.write(
        `\r\n\x1b[33mReconnecting to terminal (attempt ${status.retryCount})...\x1b[0m\r\n`
      );
    } else if (status.error) {
      // Error
      xtermRef.current.write(
        `\r\n\x1b[31mConnection error: ${status.error}\x1b[0m\r\n`
      );
    }
  }, [status.connected, status.reconnecting, status.error, status.retryCount, sessionId]);

  // Handle right-click for context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const hasSelection = xtermRef.current?.hasSelection() ?? false;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      hasSelection,
    });
  }, []);

  // Handle font size change
  const handleFontSizeChange = useCallback((newSize: number) => {
    setFontSize(newSize);
    localStorage.setItem('terminal-font-size', newSize.toString());

    // Apply font size to terminal
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = newSize;
      fitAddonRef.current?.fit();
    }
  }, []);

  // Handle scroll lock toggle
  const handleToggleScrollLock = useCallback(() => {
    const newValue = !scrollLockEnabled;
    setScrollLockEnabled(newValue);
    localStorage.setItem('terminal-scroll-lock', newValue.toString());

    const scrollManager = scrollManagerInstance.current;
    const terminal = xtermRef.current;
    const renderer = rendererInstance.current;

    if (scrollManager && terminal && renderer) {
      scrollManager.setScrollLockEnabled(newValue);

      if (newValue) {
        const lineHeight = fontSize * 1.2;
        scrollManager.scrollToBottom(terminal.buffer.active.length, terminal.rows, lineHeight);
        setFollowCursorEnabled(true);
        renderer.render(scrollManager.getViewportY(), terminal.rows);
      }
    }
  }, [scrollLockEnabled, fontSize]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Terminal container - grows to fill available space */}
      <div
        className="flex-1 relative overflow-hidden"
        onContextMenu={handleContextMenu}
      >
        {/* Connection status indicator */}
        <ConnectionStatusIndicator status={status} onRetry={connect} position="top-right" />

        {/* Scroll pause indicator (desktop only, mobile uses bottom sheet) */}
        {!isMobile && (
          <ScrollPauseIndicator
            visible={!followCursorEnabled}
            lineCount={0}
            onResume={resumeFollowCursor}
            scrollLockEnabled={scrollLockEnabled}
            onToggleScrollLock={handleToggleScrollLock}
            alwaysShowScrollLock={false}
          />
        )}

        {/* Terminal */}
        <div
          ref={terminalRef}
          className="h-full w-full"
          style={{
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            // Prevent iOS keyboard and text selection on mobile
            ...(isMobile ? {
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none',
              // NOTE: Don't use touchAction: 'none' as it prevents touch events from firing
              // Gestures are handled by GestureHandler attached to .xterm-screen element
            } : {}),
          }}
        />

        {/* Gesture feedback (swipe arrows) */}
        <GestureFeedback
          visible={feedback.visible}
          direction={feedback.direction}
          x={feedback.x}
          y={feedback.y}
        />
      </div>

      {/* Mobile keyboard (mobile devices only) - slides in from bottom */}
      {isMobile && (
        <div className={`flex-shrink-0 transition-all duration-300 ${keyboardVisible ? 'h-auto' : 'h-0 overflow-hidden'}`}>
          <MobileKeyboard
            onKeyPress={handleKeyboardInput}
            onDismiss={() => setKeyboardVisible(false)}
            visible={keyboardVisible}
          />
        </div>
      )}

      {/* Desktop FAB buttons (desktop only) */}
      {!isMobile && (
        <DesktopFabButtons
          onToggleKeyboard={() => setKeyboardVisible(!keyboardVisible)}
          keyboardVisible={keyboardVisible}
          onToggleScrollLock={handleToggleScrollLock}
          scrollLockEnabled={scrollLockEnabled}
          position="bottom-right"
        />
      )}

      {/* Mobile keyboard in desktop mode (when toggled via button) */}
      {!isMobile && keyboardVisible && (
        <MobileKeyboard
          onKeyPress={handleKeyboardInput}
          onDismiss={() => setKeyboardVisible(false)}
          visible={keyboardVisible}
          desktopMode={true}
        />
      )}

      {/* Context menu for copy/select all/paste/font size/scroll lock (mobile) */}
      {contextMenu && xtermRef.current && (
        <TerminalContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          terminal={xtermRef.current}
          hasSelection={contextMenu.hasSelection}
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          onClose={() => setContextMenu(null)}
          mobileMode={isMobile}
          scrollLockEnabled={scrollLockEnabled}
          onToggleScrollLock={handleToggleScrollLock}
        />
      )}
    </div>
  );
}
