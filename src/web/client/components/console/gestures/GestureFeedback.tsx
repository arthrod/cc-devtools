/**
 * Gesture Feedback Component
 *
 * Visual feedback for touch gestures - displays a macOS-style notification
 * in the top-right corner of the terminal showing the gesture direction.
 */

import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { GestureDirection } from './gestureConfig';

/**
 * GestureFeedback props
 */
export interface GestureFeedbackProps {
  /** Whether feedback is currently visible */
  visible: boolean;

  /** Direction of the swipe gesture */
  direction: GestureDirection | null;

  /** X position (unused in new design, kept for compatibility) */
  x: number;

  /** Y position (unused in new design, kept for compatibility) */
  y: number;
}

/**
 * Direction icon and label mapping
 */
const directionInfo = {
  [GestureDirection.Up]: { Icon: ArrowUp, label: 'Up' },
  [GestureDirection.Down]: { Icon: ArrowDown, label: 'Down' },
  [GestureDirection.Left]: { Icon: ArrowLeft, label: 'Left' },
  [GestureDirection.Right]: { Icon: ArrowRight, label: 'Right' },
};

/**
 * GestureFeedback component
 *
 * Displays a macOS-style notification in the top-right corner when a swipe gesture is detected.
 * The notification shows an arrow icon and direction label, then fades out automatically.
 *
 * @example
 * ```tsx
 * const { feedback } = useGestures({ ... });
 *
 * return (
 *   <div className="relative">
 *     <GestureFeedback
 *       visible={feedback.visible}
 *       direction={feedback.direction}
 *       x={feedback.x}
 *       y={feedback.y}
 *     />
 *   </div>
 * );
 * ```
 */
export const GestureFeedback: React.FC<GestureFeedbackProps> = ({
  visible,
  direction,
}) => {
  if (!visible || !direction) {
    return null;
  }

  const { Icon, label } = directionInfo[direction];

  return (
    <div
      className="pointer-events-none absolute top-4 right-4 z-50 transition-all duration-300 ease-in-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
        <Icon className="w-5 h-5 text-white" />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
    </div>
  );
};
