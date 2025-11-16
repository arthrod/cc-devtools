/**
 * useGestures Hook
 *
 * React hook for managing gesture detection lifecycle.
 * Wraps GestureHandler class for easy integration with React components.
 */

import { useEffect, useRef, useState } from 'react';
import { GestureHandler, type GestureHandlerCallbacks } from './GestureHandler';
import { GestureDirection } from './gestureConfig';

/**
 * Gesture hook configuration
 */
export interface UseGesturesConfig {
  /** Target element to attach gesture listeners (if not provided, gestures are inactive) */
  target?: HTMLElement | null;

  /** Called when a swipe gesture is detected */
  onSwipe?: (direction: GestureDirection) => void;

  /** Called when a single-tap gesture is detected */
  onSingleTap?: () => void;

  /** Called when a double-tap gesture is detected */
  onDoubleTap?: () => void;

  /** Called when a long-press gesture is detected (context menu) */
  onLongPress?: (x: number, y: number) => void;

  /** Called when 2-finger scroll is detected */
  onScroll?: (deltaY: number) => void;

  /** Enable gesture detection (default: true) */
  enabled?: boolean;
}

/**
 * Visual feedback state
 */
interface FeedbackState {
  visible: boolean;
  direction: GestureDirection | null;
  x: number;
  y: number;
}

/**
 * useGestures hook return value
 */
export interface UseGesturesReturn {
  /** Visual feedback state for rendering arrow icons */
  feedback: FeedbackState;

  /** Gesture handler instance (for advanced usage) */
  handler: GestureHandler | null;
}

/**
 * React hook for gesture detection
 *
 * Manages GestureHandler lifecycle and provides visual feedback state.
 *
 * @param config - Gesture configuration
 * @returns Gesture state and handler instance
 *
 * @example
 * ```tsx
 * const terminalRef = useRef<HTMLDivElement>(null);
 * const { feedback } = useGestures({
 *   target: terminalRef.current,
 *   onSwipe: (direction) => {
 *     sendArrowKey(direction);
 *   },
 *   onDoubleTap: () => {
 *     sendEnterKey();
 *   },
 *   onScroll: (deltaY) => {
 *     handleScroll(deltaY);
 *   },
 * });
 *
 * return (
 *   <div ref={terminalRef}>
 *     {feedback.visible && (
 *       <ArrowIcon direction={feedback.direction} x={feedback.x} y={feedback.y} />
 *     )}
 *   </div>
 * );
 * ```
 */
export function useGestures(config: UseGesturesConfig): UseGesturesReturn {
  const {
    target,
    onSwipe,
    onSingleTap,
    onDoubleTap,
    onLongPress,
    onScroll,
    enabled = true,
  } = config;

  const handlerRef = useRef<GestureHandler | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({
    visible: false,
    direction: null,
    x: 0,
    y: 0,
  });

  // Create gesture handler with callbacks
  useEffect(() => {
    const callbacks: GestureHandlerCallbacks = {
      onSwipe,
      onSingleTap,
      onDoubleTap,
      onLongPress,
      onScroll,
      onShowFeedback: (direction, x, y) => {
        setFeedback({
          visible: true,
          direction,
          x,
          y,
        });
      },
      onHideFeedback: () => {
        setFeedback({
          visible: false,
          direction: null,
          x: 0,
          y: 0,
        });
      },
    };

    handlerRef.current = new GestureHandler(callbacks);

    return () => {
      handlerRef.current?.detach();
      handlerRef.current = null;
    };
  }, [onSwipe, onSingleTap, onDoubleTap, onLongPress, onScroll]);

  // Attach/detach handler when target or enabled state changes
  useEffect(() => {
    const handler = handlerRef.current;
    if (!handler || !enabled || !target) {
      handler?.detach();
      return;
    }

    handler.attach(target);

    return () => {
      handler.detach();
    };
  }, [target, enabled]);

  return {
    feedback,
    handler: handlerRef.current,
  };
}
