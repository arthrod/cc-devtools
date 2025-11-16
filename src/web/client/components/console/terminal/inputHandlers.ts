/**
 * Input Handlers for Custom Terminal
 *
 * Handles wheel and touch events for terminal scrolling.
 * Provides smooth scrolling with momentum physics for touch.
 *
 * Key features:
 * - Wheel events with pixel-based scrolling
 * - Touch events with momentum physics
 * - Pointer capture for reliable touch tracking
 * - Velocity calculation for smooth momentum
 *
 * Based on VibeTunnel's proven input handling architecture.
 */

import type { Terminal } from '@xterm/xterm';
import { ScrollManager } from './scrollManager';

interface WheelHandlerConfig {
  scrollScale: number; // Scaling factor for scroll speed
}

/**
 * Create a wheel event handler for terminal scrolling
 */
export function createWheelHandler(
  scrollManager: ScrollManager,
  getTerminal: () => Terminal | null,
  getFontSize: () => number,
  getActualRows: () => number,
  requestRender: () => void,
  config: WheelHandlerConfig
) {
  return (e: WheelEvent) => {
    e.preventDefault();

    const terminal = getTerminal();
    if (!terminal) return;

    const lineHeight = getFontSize() * 1.2;
    let deltaPixelsY = 0;

    // Convert wheel deltas to pixels
    switch (e.deltaMode) {
      case WheelEvent.DOM_DELTA_PIXEL:
        deltaPixelsY = e.deltaY;
        break;
      case WheelEvent.DOM_DELTA_LINE:
        deltaPixelsY = e.deltaY * lineHeight;
        break;
      case WheelEvent.DOM_DELTA_PAGE:
        deltaPixelsY = e.deltaY * (getActualRows() * lineHeight);
        break;
    }

    // Apply scaling
    deltaPixelsY *= config.scrollScale;

    // Scroll and update state
    const buffer = terminal.buffer.active;
    const scrolled = scrollManager.scrollByPixels(
      deltaPixelsY,
      buffer.length,
      getActualRows(),
      lineHeight
    );

    if (scrolled) {
      scrollManager.updateFollowCursorState(buffer.length, getActualRows(), lineHeight);
      requestRender();
    }
  };
}

/**
 * Touch handler state for momentum scrolling
 */
interface TouchHandlerState {
  isScrolling: boolean;
  lastY: number;
  lastX: number;
  touchHistory: Array<{ y: number; x: number; time: number }>;
  momentumAnimation: number | null;
  momentumVelocityY: number;
  momentumVelocityX: number;
}

/**
 * Create touch event handlers for terminal scrolling with momentum
 */
export function createTouchHandlers(
  container: HTMLElement,
  scrollManager: ScrollManager,
  getTerminal: () => Terminal | null,
  getFontSize: () => number,
  getActualRows: () => number,
  requestRender: () => void
) {
  const state: TouchHandlerState = {
    isScrolling: false,
    lastY: 0,
    lastX: 0,
    touchHistory: [],
    momentumAnimation: null,
    momentumVelocityY: 0,
    momentumVelocityX: 0,
  };

  /**
   * Start momentum animation with exponential decay
   */
  const startMomentum = (velocityY: number, velocityX: number) => {
    // Store momentum velocities (convert from pixels/ms to pixels/frame at 60fps)
    state.momentumVelocityY = velocityY * 16;
    state.momentumVelocityX = velocityX * 16;

    // Cancel any existing momentum
    if (state.momentumAnimation) {
      cancelAnimationFrame(state.momentumAnimation);
    }

    // Start momentum animation
    animateMomentum();
  };

  /**
   * Animate momentum with exponential decay
   */
  const animateMomentum = () => {
    const minVelocity = 0.1; // Stop when velocity gets very small
    const decayFactor = 0.92; // Exponential decay per frame

    const terminal = getTerminal();
    if (!terminal) {
      state.momentumAnimation = null;
      return;
    }

    const deltaY = state.momentumVelocityY;
    const lineHeight = getFontSize() * 1.2;

    let scrolled = false;

    // Apply vertical momentum
    if (Math.abs(deltaY) > minVelocity) {
      const buffer = terminal.buffer.active;
      scrolled = scrollManager.scrollByPixels(
        deltaY,
        buffer.length,
        getActualRows(),
        lineHeight
      );

      if (!scrolled) {
        // Hit boundary, stop vertical momentum
        state.momentumVelocityY = 0;
      } else {
        // Update follow cursor state for momentum scrolling
        scrollManager.updateFollowCursorState(buffer.length, getActualRows(), lineHeight);
      }
    }

    // Decay velocities
    state.momentumVelocityY *= decayFactor;
    state.momentumVelocityX *= decayFactor;

    // Continue animation if velocities are still significant
    if (Math.abs(state.momentumVelocityY) > minVelocity || Math.abs(state.momentumVelocityX) > minVelocity) {
      state.momentumAnimation = requestAnimationFrame(() => {
        animateMomentum();
      });

      // Render if we scrolled
      if (scrolled) {
        requestRender();
      }
    } else {
      // Momentum finished
      state.momentumAnimation = null;
      state.momentumVelocityY = 0;
      state.momentumVelocityX = 0;
    }
  };

  /**
   * Stop any active momentum animation
   */
  const stopMomentum = () => {
    if (state.momentumAnimation) {
      cancelAnimationFrame(state.momentumAnimation);
      state.momentumAnimation = null;
    }
    state.momentumVelocityY = 0;
    state.momentumVelocityX = 0;
  };

  /**
   * Handle pointer down (touch start)
   */
  const handlePointerDown = (e: PointerEvent) => {
    // Only handle touch pointers, not mouse
    if (e.pointerType !== 'touch' || !e.isPrimary) return;

    // Stop any existing momentum
    stopMomentum();

    state.isScrolling = false;
    state.lastY = e.clientY;
    state.lastX = e.clientX;

    // Initialize touch tracking
    state.touchHistory = [{ y: e.clientY, x: e.clientX, time: performance.now() }];

    // Capture the pointer so we continue to receive events even if DOM rebuilds
    container.setPointerCapture(e.pointerId);
  };

  /**
   * Handle pointer move (touch move)
   */
  const handlePointerMove = (e: PointerEvent) => {
    // Only handle touch pointers that we have captured
    if (e.pointerType !== 'touch' || !container.hasPointerCapture(e.pointerId)) return;

    const currentY = e.clientY;
    const currentX = e.clientX;
    const deltaY = state.lastY - currentY; // Positive = scroll down, negative = scroll up

    // Track touch history for velocity calculation (keep last 5 points)
    const now = performance.now();
    state.touchHistory.push({ y: currentY, x: currentX, time: now });
    if (state.touchHistory.length > 5) {
      state.touchHistory.shift();
    }

    // Start scrolling if we've moved more than a few pixels
    if (!state.isScrolling && Math.abs(deltaY) > 5) {
      state.isScrolling = true;
    }

    if (!state.isScrolling) return;

    const terminal = getTerminal();
    if (!terminal) return;

    // Vertical scrolling
    if (Math.abs(deltaY) > 0) {
      const buffer = terminal.buffer.active;
      const lineHeight = getFontSize() * 1.2;
      const scrolled = scrollManager.scrollByPixels(
        deltaY,
        buffer.length,
        getActualRows(),
        lineHeight
      );

      if (scrolled) {
        scrollManager.updateFollowCursorState(buffer.length, getActualRows(), lineHeight);
        requestRender();
      }

      state.lastY = currentY;
    }
  };

  /**
   * Handle pointer up (touch end)
   */
  const handlePointerUp = (e: PointerEvent) => {
    // Only handle touch pointers
    if (e.pointerType !== 'touch') return;

    // Calculate momentum if we were scrolling
    if (state.isScrolling && state.touchHistory.length >= 2) {
      const now = performance.now();
      const recent = state.touchHistory[state.touchHistory.length - 1];
      const older = state.touchHistory[state.touchHistory.length - 2];

      const timeDiff = now - older.time;
      const distanceY = recent.y - older.y;

      // Calculate velocity in pixels per millisecond
      const velocityY = timeDiff > 0 ? -distanceY / timeDiff : 0; // Negative for scroll direction

      // Start momentum if velocity is above threshold
      const minVelocity = 0.3; // pixels per ms
      if (Math.abs(velocityY) > minVelocity) {
        startMomentum(velocityY, 0);
      }
    }

    // Release pointer capture
    container.releasePointerCapture(e.pointerId);
  };

  /**
   * Handle pointer cancel (touch cancel)
   */
  const handlePointerCancel = (e: PointerEvent) => {
    // Only handle touch pointers
    if (e.pointerType !== 'touch') return;

    // Stop momentum and release capture
    stopMomentum();
    container.releasePointerCapture(e.pointerId);
  };

  // Attach event listeners
  container.addEventListener('pointerdown', handlePointerDown);
  container.addEventListener('pointermove', handlePointerMove);
  container.addEventListener('pointerup', handlePointerUp);
  container.addEventListener('pointercancel', handlePointerCancel);

  // Return cleanup function
  return () => {
    stopMomentum();
    container.removeEventListener('pointerdown', handlePointerDown);
    container.removeEventListener('pointermove', handlePointerMove);
    container.removeEventListener('pointerup', handlePointerUp);
    container.removeEventListener('pointercancel', handlePointerCancel);
  };
}
