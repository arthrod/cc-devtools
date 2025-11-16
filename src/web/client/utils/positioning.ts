/**
 * Viewport-aware positioning utilities for context menus and popovers.
 *
 * Ensures UI elements stay within viewport boundaries while respecting
 * minimum position constraints (never below 0,0).
 */

export interface PositionAdjustmentOptions {
  /**
   * Minimum margin from viewport edges (in pixels)
   * @default 8
   */
  margin?: number;

  /**
   * Viewport dimensions override (useful for testing or custom containers)
   * @default { width: window.innerWidth, height: window.innerHeight }
   */
  viewport?: {
    width: number;
    height: number;
  };

  /**
   * Whether to flip vertically if element would overflow bottom
   * When true, positions above the cursor instead of below
   * @default false
   */
  flipVertical?: boolean;

  /**
   * Whether to flip horizontally if element would overflow right
   * When true, positions left of the cursor instead of right
   * @default false
   */
  flipHorizontal?: boolean;

  /**
   * Original position (for flip calculations)
   * Required when using flip options
   */
  originalPosition?: {
    x: number;
    y: number;
  };
}

export interface AdjustedPosition {
  x: number;
  y: number;
  /**
   * Whether position was adjusted from original
   */
  wasAdjusted: boolean;
  /**
   * Which edges caused adjustment
   */
  adjustments: {
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
    top?: boolean;
  };
}

/**
 * Adjusts position to keep element within viewport boundaries.
 *
 * Rules:
 * 1. Never position beyond viewport right/bottom edges
 * 2. Never position below (0,0) - top-left minimum
 * 3. Apply margin from viewport edges
 * 4. Optional flip behavior for overflow cases
 *
 * @param x - Desired x position (typically mouse clientX)
 * @param y - Desired y position (typically mouse clientY)
 * @param elementRect - DOMRect or dimensions of the element to position
 * @param options - Configuration options
 * @returns Adjusted position coordinates with metadata
 *
 * @example
 * ```typescript
 * // Basic usage - adjust position after render
 * const menuRect = menuRef.current.getBoundingClientRect();
 * const adjusted = adjustPositionToViewport(
 *   mouseX,
 *   mouseY,
 *   menuRect
 * );
 * setPosition({ x: adjusted.x, y: adjusted.y });
 * ```
 *
 * @example
 * ```typescript
 * // With pre-calculated dimensions
 * const adjusted = adjustPositionToViewport(
 *   mouseX,
 *   mouseY,
 *   { width: 200, height: 280 }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // With flip behavior
 * const adjusted = adjustPositionToViewport(
 *   mouseX,
 *   mouseY,
 *   menuRect,
 *   {
 *     flipVertical: true,
 *     originalPosition: { x: mouseX, y: mouseY }
 *   }
 * );
 * ```
 */
export function adjustPositionToViewport(
  x: number,
  y: number,
  elementRect: Pick<DOMRect, 'width' | 'height'> | { width: number; height: number },
  options: PositionAdjustmentOptions = {}
): AdjustedPosition {
  const {
    margin = 8,
    viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    flipVertical = false,
    flipHorizontal = false,
    originalPosition,
  } = options;

  let adjustedX = x;
  let adjustedY = y;
  const adjustments: AdjustedPosition['adjustments'] = {};

  const elementWidth = elementRect.width;
  const elementHeight = elementRect.height;

  // Calculate right and bottom edges if element positioned at x,y
  const rightEdge = x + elementWidth;
  const bottomEdge = y + elementHeight;

  // Horizontal adjustment
  if (rightEdge > viewport.width - margin) {
    if (flipHorizontal && originalPosition) {
      // Try flipping to left side of cursor
      const flippedX = originalPosition.x - elementWidth;
      if (flippedX >= margin) {
        adjustedX = flippedX;
        adjustments.right = true;
      } else {
        // Can't flip, just constrain to viewport
        adjustedX = viewport.width - elementWidth - margin;
        adjustments.right = true;
      }
    } else {
      adjustedX = viewport.width - elementWidth - margin;
      adjustments.right = true;
    }
  }

  // Vertical adjustment
  if (bottomEdge > viewport.height - margin) {
    if (flipVertical && originalPosition) {
      // Try flipping above cursor
      const flippedY = originalPosition.y - elementHeight;
      if (flippedY >= margin) {
        adjustedY = flippedY;
        adjustments.bottom = true;
      } else {
        // Can't flip, just constrain to viewport
        adjustedY = viewport.height - elementHeight - margin;
        adjustments.bottom = true;
      }
    } else {
      adjustedY = viewport.height - elementHeight - margin;
      adjustments.bottom = true;
    }
  }

  // Ensure never below (0,0) - apply minimum bounds with margin
  if (adjustedX < margin) {
    adjustedX = margin;
    adjustments.left = true;
  }

  if (adjustedY < margin) {
    adjustedY = margin;
    adjustments.top = true;
  }

  const wasAdjusted = adjustedX !== x || adjustedY !== y;

  return {
    x: adjustedX,
    y: adjustedY,
    wasAdjusted,
    adjustments,
  };
}

/**
 * Convenience function for pre-calculated element dimensions.
 * Useful when you know the menu size before rendering.
 *
 * @param x - Desired x position
 * @param y - Desired y position
 * @param width - Element width in pixels
 * @param height - Element height in pixels
 * @param options - Configuration options
 * @returns Adjusted position coordinates with metadata
 *
 * @example
 * ```typescript
 * const adjusted = adjustPositionWithDimensions(
 *   mouseX,
 *   mouseY,
 *   200,  // menu width
 *   280,  // menu height
 *   { margin: 10 }
 * );
 * ```
 */
export function adjustPositionWithDimensions(
  x: number,
  y: number,
  width: number,
  height: number,
  options: PositionAdjustmentOptions = {}
): AdjustedPosition {
  return adjustPositionToViewport(x, y, { width, height }, options);
}
