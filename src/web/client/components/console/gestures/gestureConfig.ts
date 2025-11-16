/**
 * Gesture Configuration
 *
 * Constants and thresholds for touch gesture detection in the custom terminal.
 * These values are tuned for mobile device responsiveness and accuracy.
 */

/**
 * Swipe gesture configuration (1-finger swipe for arrow keys)
 */
export const SWIPE_CONFIG = {
  /** Minimum distance in pixels for a swipe to be recognized */
  MIN_DISTANCE: 50,

  /** Maximum duration in milliseconds for a valid swipe (fast gesture) */
  MAX_DURATION: 300,

  /** Direction tolerance in degrees (±30° from cardinal direction) */
  DIRECTION_TOLERANCE: 30,

  /** Velocity threshold in pixels/ms (distance/duration) */
  MIN_VELOCITY: 0.1,
} as const;

/**
 * Double-tap gesture configuration (double-tap for Enter key)
 */
export const DOUBLE_TAP_CONFIG = {
  /** Maximum time between taps in milliseconds */
  MAX_INTERVAL: 300,

  /** Maximum distance between tap positions in pixels */
  MAX_DISTANCE: 20,

  /** Maximum tap duration (touch down to touch up) */
  MAX_TAP_DURATION: 200,
} as const;

/**
 * Long-press gesture configuration (long-press for context menu)
 */
export const LONG_PRESS_CONFIG = {
  /** Minimum duration for long press in milliseconds (iOS-style: 500ms) */
  MIN_DURATION: 500,

  /** Maximum movement allowed during long press in pixels (must stay very still) */
  MAX_MOVEMENT: 20,
} as const;

/**
 * Scroll gesture configuration (1-finger and 2-finger scroll)
 */
export const SCROLL_CONFIG = {
  /** Minimum scroll distance to trigger scroll gesture (1-finger) */
  MIN_SCROLL_DISTANCE: 10,

  /** Distance to move before entering scroll mode (cancels tap/long-press) */
  SCROLL_ACTIVATION_DISTANCE: 20,

  /** Time window for immediate scroll activation (iOS-style) */
  SCROLL_ACTIVATION_TIME: 200,

  /** Distance from bottom in pixels to resume auto-scroll */
  AUTO_SCROLL_THRESHOLD: 50,

  /** Debounce delay for scroll events in milliseconds */
  SCROLL_DEBOUNCE: 100,
} as const;

/**
 * Visual feedback configuration
 */
export const FEEDBACK_CONFIG = {
  /** Duration of visual feedback display in milliseconds */
  FEEDBACK_DURATION: 500,

  /** Size of arrow icon in pixels */
  ARROW_ICON_SIZE: 48,

  /** Haptic feedback vibration patterns (iOS/Android) */
  HAPTIC_PATTERNS: {
    /** Light tap for arrow keys */
    light: 10,
    /** Medium tap for Enter key */
    medium: 20,
    /** Heavy tap for special actions */
    heavy: 30,
  },
} as const;

/**
 * Gesture direction enumeration
 */
export enum GestureDirection {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

/**
 * Calculate direction from swipe vector
 *
 * @param deltaX - Horizontal distance (positive = right)
 * @param deltaY - Vertical distance (positive = down)
 * @returns Direction or null if ambiguous
 */
export function calculateSwipeDirection(
  deltaX: number,
  deltaY: number
): GestureDirection | null {
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  // Normalize angle to 0-360
  const normalizedAngle = (angle + 360) % 360;

  // Check if angle is within tolerance of cardinal directions
  // Right: 0° ± tolerance
  if (
    normalizedAngle <= SWIPE_CONFIG.DIRECTION_TOLERANCE ||
    normalizedAngle >= 360 - SWIPE_CONFIG.DIRECTION_TOLERANCE
  ) {
    return GestureDirection.Right;
  }

  // Down: 90° ± tolerance
  if (
    Math.abs(normalizedAngle - 90) <= SWIPE_CONFIG.DIRECTION_TOLERANCE
  ) {
    return GestureDirection.Down;
  }

  // Left: 180° ± tolerance
  if (
    Math.abs(normalizedAngle - 180) <= SWIPE_CONFIG.DIRECTION_TOLERANCE
  ) {
    return GestureDirection.Left;
  }

  // Up: 270° ± tolerance
  if (
    Math.abs(normalizedAngle - 270) <= SWIPE_CONFIG.DIRECTION_TOLERANCE
  ) {
    return GestureDirection.Up;
  }

  return null;
}

/**
 * Calculate distance between two touch points
 *
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @returns Distance in pixels
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Trigger haptic feedback if supported
 *
 * @param pattern - Vibration duration in milliseconds
 */
export function triggerHaptic(pattern: number): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
