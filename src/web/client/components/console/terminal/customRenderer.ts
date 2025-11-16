/**
 * Custom Terminal Renderer
 *
 * Renders terminal buffer to HTML manually for optimal performance.
 * Uses xterm.js as data model only - no DOM rendering from xterm.js.
 *
 * Key features:
 * - Pixel-based scroll with sub-line precision via CSS transforms
 * - Complete control over rendering timing and batching
 * - Constant DOM size (rows × cols), not growing with buffer
 *
 * Based on VibeTunnel's proven architecture.
 */

import type { Terminal } from '@xterm/xterm';
import type { IBufferLine, IBufferCell } from '@xterm/xterm';

interface RenderConfig {
  fontSize: number;
  lineHeight: number; // Multiplier (e.g., 1.2)
  cursorVisible: boolean;
  debugOverlay?: boolean; // Optional debug overlay (Phase 4.3)
}

interface DebugStats {
  renderCount: number;
  lastRenderTime: number;
  bufferLength: number;
  viewportY: number;
  fps: number;
}

export class CustomRenderer {
  private terminal: Terminal;
  private container: HTMLElement;
  private config: RenderConfig;
  private debugStats: DebugStats;
  private lastFrameTime: number;
  private frameCount: number;

  constructor(terminal: Terminal, container: HTMLElement, config: RenderConfig) {
    this.terminal = terminal;
    this.container = container;
    this.config = config;

    // Initialize debug stats (Phase 4.3)
    this.debugStats = {
      renderCount: 0,
      lastRenderTime: 0,
      bufferLength: 0,
      viewportY: 0,
      fps: 0,
    };
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
  }

  /**
   * Render the terminal buffer at the given scroll position
   * @param viewportY - Scroll position in pixels
   * @param actualRows - Number of rows to render
   */
  public render(viewportY: number, actualRows: number): void {
    const startTime = performance.now();
    const buffer = this.terminal.buffer.active;
    const bufferLength = buffer.length;
    const lineHeight = this.config.fontSize * this.config.lineHeight;

    // Convert pixel scroll position to fractional line position
    const startRowFloat = viewportY / lineHeight;
    const startRow = Math.floor(startRowFloat);
    const pixelOffset = (startRowFloat - startRow) * lineHeight;

    let html = '';
    const cell = buffer.getNullCell();

    // Get cursor position
    const cursorX = buffer.cursorX;
    const cursorY = buffer.cursorY + buffer.viewportY;

    // Render exactly actualRows
    for (let i = 0; i < actualRows; i++) {
      const row = startRow + i;

      // Apply pixel offset for smooth scrolling
      const style = pixelOffset > 0 ? ` style="transform: translateY(-${pixelOffset}px);"` : '';

      if (row >= bufferLength) {
        html += `<div class="terminal-line"${style}></div>`;
        continue;
      }

      const line = buffer.getLine(row);
      if (!line) {
        html += `<div class="terminal-line"${style}></div>`;
        continue;
      }

      const isCursorLine = row === cursorY;
      const lineContent = this.renderLine(line, cell, isCursorLine && this.config.cursorVisible ? cursorX : -1);

      html += `<div class="terminal-line"${style}>${lineContent || ''}</div>`;
    }

    // Set complete innerHTML at once
    this.container.innerHTML = html;

    // Post-process links (Phase 4.2)
    this.processLinks();

    // Update debug stats (Phase 4.3)
    const renderTime = performance.now() - startTime;
    this.updateDebugStats(viewportY, bufferLength, renderTime);

    // Render debug overlay if enabled
    if (this.config.debugOverlay) {
      this.renderDebugOverlay();
    }
  }

  /**
   * Render a single line from the buffer
   * Ported from VibeTunnel's proven rendering logic
   */
  private renderLine(line: IBufferLine, cell: IBufferCell, cursorCol: number = -1): string {
    let html = '';
    let currentChars = '';
    let currentClasses = '';
    let currentStyle = '';

    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const flushGroup = () => {
      if (currentChars) {
        const escapedChars = escapeHtml(currentChars);
        html += `<span class="${currentClasses}"${currentStyle ? ` style="${currentStyle}"` : ''}>${escapedChars}</span>`;
        currentChars = '';
      }
    };

    // Process each cell in the line
    for (let col = 0; col < line.length; col++) {
      line.getCell(col, cell);
      if (!cell) continue;

      // XTerm.js cell API - use || ' ' to ensure we get a space for empty cells
      const char = cell.getChars() || ' ';
      const width = cell.getWidth();

      // Skip zero-width cells (part of wide characters)
      if (width === 0) continue;

      // Get styling attributes
      let classes = 'terminal-char';
      let style = '';

      // Check if this is the cursor position
      const isCursor = col === cursorCol;
      if (isCursor) {
        classes += ' cursor';
      }

      // Get foreground color
      const fg = cell.getFgColor();
      if (fg !== undefined) {
        if (typeof fg === 'number' && fg >= 0 && fg <= 255) {
          // Standard palette color (0-255)
          style += `color: var(--terminal-color-${fg});`;
        } else if (typeof fg === 'number' && fg > 255) {
          // 24-bit RGB color - convert to CSS hex
          const r = (fg >> 16) & 0xff;
          const g = (fg >> 8) & 0xff;
          const b = fg & 0xff;
          style += `color: rgb(${r}, ${g}, ${b});`;
        }
      }

      // Get background color
      const bg = cell.getBgColor();
      if (bg !== undefined) {
        if (typeof bg === 'number' && bg >= 0 && bg <= 255) {
          // Standard palette color (0-255)
          style += `background-color: var(--terminal-color-${bg});`;
        } else if (typeof bg === 'number' && bg > 255) {
          // 24-bit RGB color - convert to CSS hex
          const r = (bg >> 16) & 0xff;
          const g = (bg >> 8) & 0xff;
          const b = bg & 0xff;
          style += `background-color: rgb(${r}, ${g}, ${b});`;
        }
      }

      // Get text attributes/flags
      const isBold = cell.isBold();
      const isItalic = cell.isItalic();
      const isUnderline = cell.isUnderline();
      const isDim = cell.isDim();
      const isInverse = cell.isInverse();
      const isInvisible = cell.isInvisible();
      const isStrikethrough = cell.isStrikethrough();
      const isOverline = cell.isOverline();

      if (isBold) classes += ' bold';
      if (isItalic) classes += ' italic';
      if (isUnderline) classes += ' underline';
      if (isDim) classes += ' dim';
      if (isStrikethrough) classes += ' strikethrough';
      if (isOverline) classes += ' overline';

      // Handle inverse colors
      if (isInverse) {
        // Swap foreground and background colors
        const tempFg = style.match(/color: ([^;]+);/)?.[1];
        const tempBg = style.match(/background-color: ([^;]+);/)?.[1];

        // Use theme colors as defaults
        const defaultFg = 'var(--terminal-foreground, #e4e4e4)';
        const defaultBg = 'var(--terminal-background, #0a0a0a)';

        // Determine actual foreground and background
        const actualFg = tempFg ?? defaultFg;
        const actualBg = tempBg ?? defaultBg;

        // Clear existing style and rebuild with swapped colors
        style = '';

        // Set swapped colors
        style += `color: ${actualBg};`;
        style += `background-color: ${actualFg};`;
      }

      // Apply cursor styling after inverse to ensure it takes precedence
      if (isCursor) {
        style += `background-color: rgb(var(--color-primary));`;
      }

      // Handle invisible text
      if (isInvisible) {
        style += 'opacity: 0;';
      }

      // Check if styling changed - if so, flush current group
      if (classes !== currentClasses || style !== currentStyle) {
        flushGroup();
        currentClasses = classes;
        currentStyle = style;
      }

      // Add character to current group
      currentChars += char;
    }

    // Flush final group
    flushGroup();

    return html;
  }

  /**
   * Update renderer configuration
   */
  public updateConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Process links in the rendered content
   * Detects URLs and makes them clickable
   * Phase 4.2: Link processing
   */
  private processLinks(): void {
    // URL detection regex (matches http://, https://, ftp://, file://, and www.)
    const urlRegex = /(https?:\/\/|ftp:\/\/|file:\/\/|www\.)[^\s<>'"]+/gi;

    // Get all terminal-line divs
    const lines = this.container.querySelectorAll('.terminal-line');

    lines.forEach((line) => {
      // Process text nodes within each line
      this.processTextNodes(line as HTMLElement, urlRegex);
    });
  }

  /**
   * Recursively process text nodes to detect and linkify URLs
   */
  private processTextNodes(element: HTMLElement, urlRegex: RegExp): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const nodesToReplace: Array<{ node: Text; urls: Array<{ text: string; start: number; end: number }> }> = [];

    // First pass: collect all text nodes with URLs
    let node: Text | null = walker.nextNode() as Text | null;
    while (node) {
      const text = node.textContent ?? '';
      const matches: Array<{ text: string; start: number; end: number }> = [];

      // Reset regex lastIndex
      urlRegex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = urlRegex.exec(text)) !== null) {
        matches.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      if (matches.length > 0) {
        nodesToReplace.push({ node, urls: matches });
      }

      node = walker.nextNode() as Text | null;
    }

    // Second pass: replace text nodes with links
    nodesToReplace.forEach(({ node, urls }) => {
      const text = node.textContent ?? '';
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      urls.forEach(({ text: urlText, start, end }) => {
        // Add text before URL
        if (start > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, start)));
        }

        // Create link element
        const link = document.createElement('a');
        link.href = urlText.startsWith('www.') ? `https://${urlText}` : urlText;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'terminal-link';
        link.textContent = urlText;
        link.style.color = 'var(--terminal-link-color, #4a9eff)';
        link.style.textDecoration = 'underline';
        link.style.cursor = 'pointer';
        // Re-enable pointer events for links
        link.style.pointerEvents = 'auto';

        fragment.appendChild(link);
        lastIndex = end;
      });

      // Add remaining text after last URL
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      // Replace the text node with the fragment
      node.parentNode?.replaceChild(fragment, node);
    });
  }

  /**
   * Update debug statistics
   * Phase 4.3: Debug overlay
   */
  private updateDebugStats(viewportY: number, bufferLength: number, renderTime: number): void {
    this.debugStats.renderCount++;
    this.debugStats.lastRenderTime = renderTime;
    this.debugStats.viewportY = viewportY;
    this.debugStats.bufferLength = bufferLength;

    // Calculate FPS (update every 10 frames)
    this.frameCount++;
    if (this.frameCount >= 10) {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      this.debugStats.fps = Math.round((this.frameCount / elapsed) * 1000);
      this.lastFrameTime = now;
      this.frameCount = 0;
    }
  }

  /**
   * Render debug overlay showing performance stats
   * Phase 4.3: Debug overlay
   */
  private renderDebugOverlay(): void {
    // Check if overlay already exists
    let overlay = this.container.querySelector('.terminal-debug-overlay') as HTMLDivElement;

    if (!overlay) {
      // Create overlay element
      overlay = document.createElement('div');
      overlay.className = 'terminal-debug-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '8px';
      overlay.style.right = '8px';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      overlay.style.color = '#00ff00';
      overlay.style.padding = '8px 12px';
      overlay.style.fontFamily = 'monospace';
      overlay.style.fontSize = '11px';
      overlay.style.borderRadius = '4px';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '1000';
      overlay.style.whiteSpace = 'pre';
      this.container.appendChild(overlay);
    }

    // Update overlay content
    overlay.textContent = [
      `Renders: ${this.debugStats.renderCount}`,
      `Render Time: ${this.debugStats.lastRenderTime.toFixed(2)}ms`,
      `FPS: ${this.debugStats.fps}`,
      `Buffer Length: ${this.debugStats.bufferLength}`,
      `Viewport Y: ${this.debugStats.viewportY.toFixed(0)}px`,
    ].join('\n');
  }

  /**
   * Get current debug statistics
   * Phase 4.3: Debug overlay
   */
  public getDebugStats(): DebugStats {
    return { ...this.debugStats };
  }
}
