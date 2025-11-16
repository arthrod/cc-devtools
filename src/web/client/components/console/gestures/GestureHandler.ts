/**
 * Gesture Handler
 *
 * Detects and processes touch gestures for the custom terminal:
 * - 1-finger swipe → Arrow keys (up/down/left/right)
 * - 2-finger scroll → Terminal output scroll with auto-scroll pause
 * - Double-tap → Enter key
 *
 * Visual feedback and haptics are provided for each gesture type.
 */

import type { GestureEvent } from '@/web/shared/types/console';
import {
  SWIPE_CONFIG,
  DOUBLE_TAP_CONFIG,
  LONG_PRESS_CONFIG,
  SCROLL_CONFIG,
  FEEDBACK_CONFIG,
  GestureDirection,
  calculateSwipeDirection,
  calculateDistance,
  triggerHaptic,
} from './gestureConfig';

/**
 * Touch point data for gesture tracking
 */
interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Gesture handler callbacks
 */
export interface GestureHandlerCallbacks {
  /** Called when a swipe gesture is detected (arrow key equivalent) */
  onSwipe?: (direction: GestureDirection) => void;

  /** Called when a single-tap gesture is detected (show keyboard) */
  onSingleTap?: () => void;

  /** Called when a double-tap gesture is detected (Enter key equivalent) */
  onDoubleTap?: () => void;

  /** Called when a long-press gesture is detected (context menu) */
  onLongPress?: (x: number, y: number) => void;

  /** Called when 2-finger scroll is detected */
  onScroll?: (deltaY: number) => void;

  /** Called when visual feedback should be shown */
  onShowFeedback?: (direction: GestureDirection, x: number, y: number) => void;

  /** Called when visual feedback should be hidden */
  onHideFeedback?: () => void;
}

/**
 * GestureHandler class
 *
 * Manages touch event listeners and gesture detection logic.
 * Supports 1-finger swipe, 2-finger scroll, and double-tap gestures.
 */
export class GestureHandler {
  private element: HTMLElement | null = null;
  private callbacks: GestureHandlerCallbacks;

  // Touch tracking state
  private touchStartPoint: TouchPoint | null = null;
  private touchCount = 0;
  private lastTapTime = 0;
  private lastTapPosition: TouchPoint | null = null;
  private singleTapTimeout: number | null = null;

  // Long press tracking state
  private longPressTimeout: number | null = null;
  private longPressTriggered = false;

  // Scroll tracking state
  private isScrolling = false;
  private scrollStartY = 0;
  private singleFingerScrolling = false; // Track 1-finger scroll mode

  // Visual feedback state
  private feedbackTimeout: number | null = null;

  /**
   * Create a new GestureHandler
   *
   * @param callbacks - Event callbacks for gesture events
   */
  constructor(callbacks: GestureHandlerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Attach gesture detection to an HTML element
   *
   * @param element - Target element to listen for gestures
   */
  attach(element: HTMLElement): void {
    this.detach(); // Clean up previous listeners
    this.element = element;

    // Passive listeners for scroll performance
    element.addEventListener('touchstart', this.handleTouchStart, {
      passive: false,
    });
    element.addEventListener('touchmove', this.handleTouchMove, {
      passive: false,
    });
    element.addEventListener('touchend', this.handleTouchEnd, {
      passive: false,
    });
    element.addEventListener('touchcancel', this.handleTouchCancel, {
      passive: true,
    });
  }

  /**
   * Detach gesture detection and clean up listeners
   */
  detach(): void {
    if (!this.element) return;

    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);

    this.element = null;
    this.reset();
  }

  /**
   * Reset all gesture tracking state
   */
  private reset(): void {
    this.touchStartPoint = null;
    this.touchCount = 0;
    this.isScrolling = false;
    this.scrollStartY = 0;
    this.singleFingerScrolling = false;
    this.longPressTriggered = false;

    if (this.longPressTimeout !== null) {
      window.clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }

    if (this.singleTapTimeout !== null) {
      window.clearTimeout(this.singleTapTimeout);
      this.singleTapTimeout = null;
    }

    if (this.feedbackTimeout !== null) {
      window.clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
      this.callbacks.onHideFeedback?.();
    }
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart = (event: TouchEvent): void => {
    this.touchCount = event.touches.length;

    if (this.touchCount === 1) {
      // Single finger - potential swipe, double-tap, or long-press
      const touch = event.touches[0];
      if (!touch) return;

      this.touchStartPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };

      // Reset long press state
      this.longPressTriggered = false;

      // Start long-press timer
      this.longPressTimeout = window.setTimeout(() => {
        // Check if touch is still within movement threshold
        if (this.touchStartPoint) {
          this.longPressTriggered = true;

          // Cancel single-tap if long-press is triggered
          if (this.singleTapTimeout !== null) {
            window.clearTimeout(this.singleTapTimeout);
            this.singleTapTimeout = null;
          }

          this.callbacks.onLongPress?.(this.touchStartPoint.x, this.touchStartPoint.y);
          triggerHaptic(FEEDBACK_CONFIG.HAPTIC_PATTERNS.medium);
        }
      }, LONG_PRESS_CONFIG.MIN_DURATION);

      // Check for double-tap
      this.checkDoubleTap(this.touchStartPoint);
    } else if (this.touchCount === 2) {
      // Two fingers - scroll gesture
      const touch = event.touches[0];
      if (!touch) return;

      // Cancel long press if second finger is added
      if (this.longPressTimeout !== null) {
        window.clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }

      this.isScrolling = true;
      this.scrollStartY = touch.clientY;

      // Prevent default to avoid page scroll
      event.preventDefault();
    }
  };

  /**
   * Handle touch move event
   */
  private handleTouchMove = (event: TouchEvent): void => {
    if (this.touchCount === 1 && this.touchStartPoint) {
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - this.touchStartPoint.x;
      const deltaY = touch.clientY - this.touchStartPoint.y;
      const distance = calculateDistance(
        this.touchStartPoint.x,
        this.touchStartPoint.y,
        touch.clientX,
        touch.clientY
      );
      const timeSinceStart = Date.now() - this.touchStartPoint.timestamp;

      // iOS-style: Immediate scroll activation
      // If moved >20px within 200ms, enter scroll mode immediately
      if (
        !this.singleFingerScrolling &&
        distance > SCROLL_CONFIG.SCROLL_ACTIVATION_DISTANCE &&
        timeSinceStart < SCROLL_CONFIG.SCROLL_ACTIVATION_TIME
      ) {
        // Enter scroll mode
        this.singleFingerScrolling = true;
        this.scrollStartY = touch.clientY;

        // Cancel all other gestures
        if (this.longPressTimeout !== null) {
          window.clearTimeout(this.longPressTimeout);
          this.longPressTimeout = null;
        }
        if (this.singleTapTimeout !== null) {
          window.clearTimeout(this.singleTapTimeout);
          this.singleTapTimeout = null;
        }

        event.preventDefault();
      }

      // Handle single-finger scrolling
      if (this.singleFingerScrolling) {
        const scrollDeltaY = this.scrollStartY - touch.clientY;

        if (Math.abs(scrollDeltaY) > SCROLL_CONFIG.MIN_SCROLL_DISTANCE) {
          this.callbacks.onScroll?.(scrollDeltaY);
          this.scrollStartY = touch.clientY;
        }

        event.preventDefault();
        return; // Skip other gesture checks when scrolling
      }

      // Cancel long press if moved too much (for non-scroll movements)
      if (distance > LONG_PRESS_CONFIG.MAX_MOVEMENT && this.longPressTimeout !== null) {
        window.clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }

      // Cancel single-tap if moved (this is a swipe or drag, not a tap)
      if (distance > SWIPE_CONFIG.MIN_DISTANCE / 4 && this.singleTapTimeout !== null) {
        window.clearTimeout(this.singleTapTimeout);
        this.singleTapTimeout = null;
      }

      // Show visual feedback if swipe is in progress (only if swipe handler is defined)
      if (distance > SWIPE_CONFIG.MIN_DISTANCE / 2 && this.callbacks.onSwipe) {
        const direction = calculateSwipeDirection(deltaX, deltaY);
        if (direction) {
          this.callbacks.onShowFeedback?.(
            direction,
            touch.clientX,
            touch.clientY
          );
        }
      }
    } else if (this.touchCount === 2 && this.isScrolling) {
      // Two finger scroll
      const touch = event.touches[0];
      if (!touch) return;

      const deltaY = this.scrollStartY - touch.clientY;

      if (Math.abs(deltaY) > SCROLL_CONFIG.MIN_SCROLL_DISTANCE) {
        this.callbacks.onScroll?.(deltaY);
        this.scrollStartY = touch.clientY;
      }

      event.preventDefault();
    }
  };

  /**
   * Handle touch end event
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    // Cancel long press timer if active
    if (this.longPressTimeout !== null) {
      window.clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }

    if (this.touchCount === 1 && this.touchStartPoint) {
      // If was in single-finger scroll mode, just end it
      if (this.singleFingerScrolling) {
        this.singleFingerScrolling = false;
        this.touchStartPoint = null;
        this.touchCount = 0;
        return;
      }

      // Don't process swipe if long press was triggered
      if (this.longPressTriggered) {
        this.longPressTriggered = false;
        this.touchStartPoint = null;
        this.touchCount = 0;
        return;
      }

      // Check for completed swipe
      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - this.touchStartPoint.x;
      const deltaY = touch.clientY - this.touchStartPoint.y;
      const duration = Date.now() - this.touchStartPoint.timestamp;
      const distance = calculateDistance(
        this.touchStartPoint.x,
        this.touchStartPoint.y,
        touch.clientX,
        touch.clientY
      );

      // Validate swipe criteria
      if (
        distance >= SWIPE_CONFIG.MIN_DISTANCE &&
        duration <= SWIPE_CONFIG.MAX_DURATION
      ) {
        const velocity = distance / duration;

        if (velocity >= SWIPE_CONFIG.MIN_VELOCITY) {
          const direction = calculateSwipeDirection(deltaX, deltaY);

          if (direction && this.callbacks.onSwipe) {
            this.callbacks.onSwipe(direction);
            triggerHaptic(FEEDBACK_CONFIG.HAPTIC_PATTERNS.light);

            // Show final feedback
            this.callbacks.onShowFeedback?.(
              direction,
              touch.clientX,
              touch.clientY
            );
            this.scheduleFeedbackHide();
          }
        }
      }
    } else if (this.touchCount === 2 && this.isScrolling) {
      // End 2-finger scroll
      this.isScrolling = false;
    }

    // Hide feedback on touch end
    this.callbacks.onHideFeedback?.();
    this.touchStartPoint = null;
    this.touchCount = 0;
  };

  /**
   * Handle touch cancel event
   */
  private handleTouchCancel = (): void => {
    this.reset();
  };

  /**
   * Check if current tap is a double-tap
   *
   * @param currentTap - Current tap position and timestamp
   */
  private checkDoubleTap(currentTap: TouchPoint): void {
    const now = currentTap.timestamp;
    const timeSinceLastTap = now - this.lastTapTime;

    // Clear any pending single-tap timeout
    if (this.singleTapTimeout !== null) {
      clearTimeout(this.singleTapTimeout);
      this.singleTapTimeout = null;
    }

    if (
      this.lastTapPosition &&
      timeSinceLastTap <= DOUBLE_TAP_CONFIG.MAX_INTERVAL
    ) {
      // Check distance between taps
      const distance = calculateDistance(
        this.lastTapPosition.x,
        this.lastTapPosition.y,
        currentTap.x,
        currentTap.y
      );

      if (distance <= DOUBLE_TAP_CONFIG.MAX_DISTANCE) {
        // Valid double-tap detected
        this.callbacks.onDoubleTap?.();
        triggerHaptic(FEEDBACK_CONFIG.HAPTIC_PATTERNS.medium);

        // Cancel long press on double-tap
        if (this.longPressTimeout !== null) {
          window.clearTimeout(this.longPressTimeout);
          this.longPressTimeout = null;
        }

        // Reset tap tracking to prevent triple-tap
        this.lastTapTime = 0;
        this.lastTapPosition = null;
        return;
      }
    }

    // Update last tap tracking
    this.lastTapTime = now;
    this.lastTapPosition = currentTap;

    // Schedule single-tap callback if no second tap or long press comes
    // Wait longer than long-press duration to let long press take priority
    this.singleTapTimeout = window.setTimeout(() => {
      // Only trigger if not long-pressing
      if (!this.longPressTriggered) {
        this.callbacks.onSingleTap?.();
      }
      this.singleTapTimeout = null;
    }, Math.max(DOUBLE_TAP_CONFIG.MAX_INTERVAL, LONG_PRESS_CONFIG.MIN_DURATION + 50));
  }

  /**
   * Schedule visual feedback to hide after delay
   */
  private scheduleFeedbackHide(): void {
    if (this.feedbackTimeout !== null) {
      window.clearTimeout(this.feedbackTimeout);
    }

    this.feedbackTimeout = window.setTimeout(() => {
      this.callbacks.onHideFeedback?.();
      this.feedbackTimeout = null;
    }, FEEDBACK_CONFIG.FEEDBACK_DURATION);
  }
}
