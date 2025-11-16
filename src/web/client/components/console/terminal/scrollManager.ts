/**
 * Scroll Manager for Custom Terminal
 *
 * Manages pixel-based scroll position independent of xterm.js.
 * Provides precise scroll control and follow-cursor behavior.
 *
 * Key features:
 * - Pixel-based viewport tracking (_viewportY)
 * - Follow cursor enable/disable logic
 * - Programmatic scroll flag to prevent state updates during auto-scroll
 * - Boundary calculations for safe scrolling
 *
 * Based on VibeTunnel's proven scroll management architecture.
 */

import type { Terminal } from '@xterm/xterm';

interface ScrollState {
  viewportY: number; // Current scroll position in pixels
  followCursorEnabled: boolean; // Auto-scroll flag
  programmaticScroll: boolean; // Prevent state updates during programmatic scroll
  scrollLockEnabled: boolean; // Force scroll to bottom after every render
}

export class ScrollManager {
  private state: ScrollState = {
    viewportY: 0,
    followCursorEnabled: true,
    programmaticScroll: false,
    scrollLockEnabled: false,
  };

  /**
   * Get current viewport scroll position in pixels
   */
  public getViewportY(): number {
    return this.state.viewportY;
  }

  /**
   * Set viewport scroll position in pixels
   */
  public setViewportY(value: number): void {
    this.state.viewportY = value;
  }

  /**
   * Check if follow cursor is enabled
   */
  public isFollowCursorEnabled(): boolean {
    return this.state.followCursorEnabled;
  }

  /**
   * Enable or disable follow cursor
   */
  public setFollowCursorEnabled(enabled: boolean): void {
    this.state.followCursorEnabled = enabled;
  }

  /**
   * Check if we're in programmatic scroll mode
   */
  public isProgrammaticScroll(): boolean {
    return this.state.programmaticScroll;
  }

  /**
   * Set programmatic scroll flag
   */
  public setProgrammaticScroll(value: boolean): void {
    this.state.programmaticScroll = value;
  }

  /**
   * Check if scroll lock is enabled
   */
  public isScrollLockEnabled(): boolean {
    return this.state.scrollLockEnabled;
  }

  /**
   * Enable or disable scroll lock
   * When enabled, viewport is forced to bottom after every render
   */
  public setScrollLockEnabled(enabled: boolean): void {
    this.state.scrollLockEnabled = enabled;
    if (enabled) {
      this.state.followCursorEnabled = true;
    }
  }

  /**
   * Calculate maximum scroll position in pixels
   */
  public calculateMaxScrollPixels(bufferLength: number, actualRows: number, lineHeight: number): number {
    return Math.max(0, (bufferLength - actualRows) * lineHeight);
  }

  /**
   * Check if scrolled to bottom (within 1 line height)
   */
  public isScrolledToBottom(bufferLength: number, actualRows: number, lineHeight: number): boolean {
    const maxScrollPixels = this.calculateMaxScrollPixels(bufferLength, actualRows, lineHeight);
    // Within 1 line height of bottom
    return this.state.viewportY >= maxScrollPixels - lineHeight;
  }

  /**
   * Scroll to the bottom of the buffer
   */
  public scrollToBottom(bufferLength: number, actualRows: number, lineHeight: number): void {
    const maxScrollPixels = this.calculateMaxScrollPixels(bufferLength, actualRows, lineHeight);
    this.state.programmaticScroll = true;
    this.state.viewportY = maxScrollPixels;
    this.state.programmaticScroll = false;
  }

  /**
   * Scroll by a delta in pixels
   * @returns true if scrolled, false if hit boundary
   */
  public scrollByPixels(deltaPixels: number, bufferLength: number, actualRows: number, lineHeight: number): boolean {
    const maxScrollPixels = this.calculateMaxScrollPixels(bufferLength, actualRows, lineHeight);
    const newViewportY = Math.max(0, Math.min(maxScrollPixels, this.state.viewportY + deltaPixels));

    if (newViewportY !== this.state.viewportY) {
      this.state.viewportY = newViewportY;
      return true; // Scrolled
    }

    return false; // Hit boundary
  }

  /**
   * Update follow cursor state based on current scroll position
   * Automatically enables follow cursor when scrolled to bottom
   * Disables when user scrolls away from bottom
   * If scroll lock is enabled, temporarily disables it when user manually scrolls
   */
  public updateFollowCursorState(bufferLength: number, actualRows: number, lineHeight: number): void {
    if (this.state.programmaticScroll) return;

    const wasAtBottom = this.isScrolledToBottom(bufferLength, actualRows, lineHeight);

    if (wasAtBottom && !this.state.followCursorEnabled) {
      this.state.followCursorEnabled = true;
    } else if (!wasAtBottom && this.state.followCursorEnabled) {
      this.state.followCursorEnabled = false;
      if (this.state.scrollLockEnabled) {
        this.state.scrollLockEnabled = false;
      }
    }
  }

  /**
   * Follow cursor to keep it visible in viewport
   * Only scrolls if cursor is outside viewport
   * When scroll lock is enabled, always scrolls to bottom
   */
  public followCursor(terminal: Terminal, lineHeight: number, actualRows: number): void {
    if (!this.state.followCursorEnabled) return;

    // If scroll lock is enabled, always scroll to bottom
    if (this.state.scrollLockEnabled) {
      const buffer = terminal.buffer.active;
      const maxScrollPixels = this.calculateMaxScrollPixels(buffer.length, actualRows, lineHeight);
      this.state.programmaticScroll = true;
      this.state.viewportY = maxScrollPixels;
      this.state.programmaticScroll = false;
      return;
    }

    const buffer = terminal.buffer.active;
    const cursorY = buffer.cursorY + buffer.viewportY; // Absolute cursor position
    const cursorLine = cursorY;

    // Calculate current viewport range in lines
    const viewportStartLine = Math.floor(this.state.viewportY / lineHeight);
    const viewportEndLine = viewportStartLine + actualRows - 1;

    // Only scroll if cursor is outside viewport
    this.state.programmaticScroll = true;

    if (cursorLine < viewportStartLine) {
      // Cursor above viewport - scroll up
      this.state.viewportY = cursorLine * lineHeight;
    } else if (cursorLine > viewportEndLine) {
      // Cursor below viewport - scroll down to show cursor at bottom
      this.state.viewportY = Math.max(0, (cursorLine - actualRows + 1) * lineHeight);
    }

    // Ensure we don't scroll past buffer
    const maxScrollPixels = this.calculateMaxScrollPixels(buffer.length, actualRows, lineHeight);
    this.state.viewportY = Math.min(this.state.viewportY, maxScrollPixels);

    this.state.programmaticScroll = false;
  }
}
