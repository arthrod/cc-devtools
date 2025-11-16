/**
 * VibeTunnel Binary Buffer Decoder
 *
 * Decodes VibeTunnel's proprietary binary buffer format into terminal escape sequences
 * for rendering in xterm.js.
 *
 * Architecture:
 * - Maintains a virtual terminal buffer (10k lines) to preserve scrollback history
 * - Uses incremental updates: appends new rows, diffs visible rows
 * - Never clears screen (except when server sends blank rows)
 * - Uses viewportY to track absolute position in scrollback buffer
 *
 * Binary Format:
 * Header (32 bytes):
 *   [0-1]   Magic "VT" (0x5654)
 *   [2]     Version (0x01)
 *   [3]     Flags
 *   [4-7]   Cols (UInt32LE)
 *   [8-11]  Rows (UInt32LE)
 *   [12-15] ViewportY (Int32LE) - Absolute row index of first visible line
 *   [16-19] CursorX (Int32LE)
 *   [20-23] CursorY (Int32LE)
 *   [24-27] Reserved
 *   [28-31] Reserved
 *
 * Cell Data:
 *   Row markers:
 *     0xFE = Empty row (followed by count byte)
 *     0xFD = Row with content (followed by cell count UInt16LE)
 *
 *   Cell encoding:
 *     Type byte (bit flags):
 *       Bit 7: Has extended data (attrs/colors)
 *       Bit 6: Is Unicode (vs ASCII)
 *       Bit 5: Has foreground color
 *       Bit 4: Has background color
 *       Bit 3: Is RGB foreground
 *       Bit 2: Is RGB background
 *       Bits 1-0: Character type (00=space, 01=ASCII, 10=Unicode)
 *
 *     Character data (if not simple space):
 *       - ASCII: 1 byte character code
 *       - Unicode: 1 byte length + UTF-8 bytes
 *
 *     Extended data (if bit 7 set):
 *       - Attributes byte (bold, italic, underline, etc.)
 *       - Foreground color (1 byte palette or 3 bytes RGB)
 *       - Background color (1 byte palette or 3 bytes RGB)
 */

interface BufferCell {
  char: string;
  fg?: number;
  bg?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  inverse?: boolean;
  invisible?: boolean;
  strikethrough?: boolean;
}

interface DecodedBuffer {
  cols: number;
  rows: number;
  viewportY: number;
  cursorX: number;
  cursorY: number;
  cells: BufferCell[][];
}

/**
 * Simple hash function for row content diffing
 */
function hashRow(cells: BufferCell[]): number {
  let hash = 0;
  for (const cell of cells) {
    // Hash character and attributes
    const charCode = cell.char.charCodeAt(0);
    const attrs = (cell.bold ? 1 : 0) |
                  (cell.italic ? 2 : 0) |
                  (cell.underline ? 4 : 0) |
                  (cell.fg !== undefined ? 8 : 0) |
                  (cell.bg !== undefined ? 16 : 0);
    const combined = (charCode << 8) | attrs | (cell.fg ?? 0) << 16 | (cell.bg ?? 0) << 24;
    hash = ((hash << 5) - hash) + combined;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * VirtualTerminalBuffer manages a large scrollback buffer (10k lines)
 * and generates incremental ANSI updates to preserve xterm.js scrollback.
 */
class VirtualTerminalBuffer {
  private lines = new Map<number, BufferCell[]>();
  private lineHashes = new Map<number, number>();
  private committedRow = -1;
  private lastViewportY = 0;
  private readonly maxLines = 10000;

  /**
   * Check if the buffer represents a cleared screen
   */
  private isScreenCleared(cells: BufferCell[][]): boolean {
    if (cells.length === 0) return true;

    // Count how many rows are effectively blank
    let blankRows = 0;
    for (const row of cells) {
      const isBlank = row.length === 0 ||
                      row.every(cell => cell.char === ' ' && !cell.fg && !cell.bg);
      if (isBlank) blankRows++;
    }

    // If >80% of rows are blank, consider it a screen clear
    return blankRows / cells.length > 0.8;
  }

  /**
   * Apply a snapshot from VibeTunnel and generate incremental ANSI output
   */
  applySnapshot(buffer: DecodedBuffer): string {
    const firstVisibleRow = buffer.viewportY;
    const lastVisibleRow = firstVisibleRow + buffer.cells.length - 1;

    // Detect screen clearing scenarios
    const viewportJumpedBackwards = firstVisibleRow < this.lastViewportY - 10;
    const screenCleared = this.isScreenCleared(buffer.cells);
    const shouldClearScreen = viewportJumpedBackwards || screenCleared;

    // Store snapshot rows in virtual buffer
    buffer.cells.forEach((row, i) => {
      const absoluteRow = firstVisibleRow + i;
      this.lines.set(absoluteRow, row);
      this.lineHashes.set(absoluteRow, hashRow(row));
    });

    // Trim old rows if we exceed max buffer size
    if (this.lines.size > this.maxLines) {
      const minRow = Math.min(...Array.from(this.lines.keys()));
      const deleteCount = this.lines.size - this.maxLines;
      for (let i = 0; i < deleteCount; i++) {
        this.lines.delete(minRow + i);
        this.lineHashes.delete(minRow + i);
      }
    }

    let output = '';

    // If screen was cleared, emit clear codes and reset tracking
    if (shouldClearScreen) {
      console.log('[VirtualBuffer] Screen clear detected, resetting');
      output += '\x1b[2J';  // Clear entire screen
      output += '\x1b[H';   // Move to home
      this.committedRow = firstVisibleRow - 1; // Reset committed row
    }

    // If viewport scrolled down, append new rows to build scrollback
    if (lastVisibleRow > this.committedRow) {
      const startRow = Math.max(this.committedRow + 1, firstVisibleRow);
      for (let row = startRow; row <= lastVisibleRow; row++) {
        const cells = this.lines.get(row);
        if (cells) {
          output += renderRowToAnsi(cells);
          output += '\r\n'; // Let xterm.js push this into scrollback
        }
      }
      this.committedRow = lastVisibleRow;
    }

    // Diff and update visible rows (for cases where viewport is static or scrolled up)
    output += this.renderViewportDiff(firstVisibleRow, buffer.cells, buffer.rows);

    // Position cursor
    output += `\x1b[${buffer.cursorY + 1};${buffer.cursorX + 1}H`;

    this.lastViewportY = firstVisibleRow;
    return output;
  }

  /**
   * Generate ANSI codes to update only changed rows in the visible viewport
   */
  private renderViewportDiff(firstVisibleRow: number, cells: BufferCell[][], terminalRows: number): string {
    let output = '';

    for (let i = 0; i < cells.length; i++) {
      const absoluteRow = firstVisibleRow + i;
      const screenRow = i + 1; // ANSI coordinates are 1-indexed
      const cells = this.lines.get(absoluteRow);

      if (!cells) continue;

      // Check if row changed by comparing hash
      const currentHash = this.lineHashes.get(absoluteRow);
      // We need to track what was last drawn to screen, not just what's in buffer
      // For simplicity, always update during diff phase (optimization can come later)

      // Position cursor at start of row
      output += `\x1b[${screenRow};1H`;

      // Render the row
      output += renderRowToAnsi(cells);

      // Clear to end of line (in case new content is shorter)
      output += '\x1b[K';
    }

    return output;
  }

  /**
   * Reset the buffer (e.g., when connecting to a new session)
   */
  reset(): void {
    this.lines.clear();
    this.lineHashes.clear();
    this.committedRow = -1;
    this.lastViewportY = 0;
  }
}

/**
 * Render a single row of cells to ANSI escape sequences
 */
function renderRowToAnsi(cells: BufferCell[]): string {
  let output = '';
  let currentFg: number | undefined;
  let currentBg: number | undefined;
  let currentAttrs = {
    bold: false,
    italic: false,
    underline: false,
    dim: false,
    inverse: false,
    strikethrough: false,
  };

  for (const cell of cells) {
    // Check if we need to reset
    let needsReset = false;

    const attrsChanged =
      cell.bold !== currentAttrs.bold ||
      cell.italic !== currentAttrs.italic ||
      cell.underline !== currentAttrs.underline ||
      cell.dim !== currentAttrs.dim ||
      cell.inverse !== currentAttrs.inverse ||
      cell.strikethrough !== currentAttrs.strikethrough;

    if (attrsChanged || cell.fg !== currentFg || cell.bg !== currentBg) {
      needsReset = true;
    }

    if (needsReset) {
      // Reset all attributes
      output += '\x1b[0m';
      currentFg = undefined;
      currentBg = undefined;
      currentAttrs = {
        bold: false,
        italic: false,
        underline: false,
        dim: false,
        inverse: false,
        strikethrough: false,
      };
    }

    // Apply new attributes
    if (cell.bold && !currentAttrs.bold) {
      output += '\x1b[1m';
      currentAttrs.bold = true;
    }
    if (cell.dim && !currentAttrs.dim) {
      output += '\x1b[2m';
      currentAttrs.dim = true;
    }
    if (cell.italic && !currentAttrs.italic) {
      output += '\x1b[3m';
      currentAttrs.italic = true;
    }
    if (cell.underline && !currentAttrs.underline) {
      output += '\x1b[4m';
      currentAttrs.underline = true;
    }
    if (cell.inverse && !currentAttrs.inverse) {
      output += '\x1b[7m';
      currentAttrs.inverse = true;
    }
    if (cell.strikethrough && !currentAttrs.strikethrough) {
      output += '\x1b[9m';
      currentAttrs.strikethrough = true;
    }

    // Apply colors
    if (cell.fg !== undefined && cell.fg !== currentFg) {
      output += colorToAnsi(cell.fg, true);
      currentFg = cell.fg;
    }
    if (cell.bg !== undefined && cell.bg !== currentBg) {
      output += colorToAnsi(cell.bg, false);
      currentBg = cell.bg;
    }

    // Add character
    output += cell.char;
  }

  // Reset at end of line
  output += '\x1b[0m';
  return output;
}

/**
 * Global instance of virtual terminal buffer
 */
const virtualBuffer = new VirtualTerminalBuffer();

/**
 * ANSI color palette (xterm-256 colors)
 * Used for converting palette indices to RGB
 */
const ANSI_COLORS: Record<number, [number, number, number]> = {
  // Standard colors (0-7)
  0: [0, 0, 0],       // Black
  1: [205, 0, 0],     // Red
  2: [0, 205, 0],     // Green
  3: [205, 205, 0],   // Yellow
  4: [0, 0, 238],     // Blue
  5: [205, 0, 205],   // Magenta
  6: [0, 205, 205],   // Cyan
  7: [229, 229, 229], // White

  // Bright colors (8-15)
  8: [127, 127, 127],   // Bright Black
  9: [255, 0, 0],       // Bright Red
  10: [0, 255, 0],      // Bright Green
  11: [255, 255, 0],    // Bright Yellow
  12: [92, 92, 255],    // Bright Blue
  13: [255, 0, 255],    // Bright Magenta
  14: [0, 255, 255],    // Bright Cyan
  15: [255, 255, 255],  // Bright White
};

/**
 * Generate xterm-256 color palette
 */
function generateXterm256Palette(): Record<number, [number, number, number]> {
  const palette = { ...ANSI_COLORS };

  // 216 color cube (16-231)
  for (let i = 0; i < 216; i++) {
    const r = Math.floor(i / 36);
    const g = Math.floor((i % 36) / 6);
    const b = i % 6;

    const toRgb = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    palette[16 + i] = [toRgb(r), toRgb(g), toRgb(b)];
  }

  // Grayscale (232-255)
  for (let i = 0; i < 24; i++) {
    const gray = 8 + i * 10;
    palette[232 + i] = [gray, gray, gray];
  }

  return palette;
}

const XTERM_256_PALETTE = generateXterm256Palette();

/**
 * Convert color to ANSI escape sequence
 */
function colorToAnsi(color: number, isForeground: boolean): string {
  if (color <= 255) {
    // Palette color
    const code = isForeground ? 38 : 48;
    return `\x1b[${code};5;${color}m`;
  } else {
    // RGB color
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const code = isForeground ? 38 : 48;
    return `\x1b[${code};2;${r};${g};${b}m`;
  }
}

/**
 * Decode VibeTunnel binary buffer format
 */
export function decodeVibeBuffer(data: ArrayBuffer): DecodedBuffer {
  const view = new DataView(data);
  let offset = 0;

  // Validate magic bytes
  const magic = view.getUint16(offset, true); // little-endian
  offset += 2;

  if (magic !== 0x5654) {
    throw new Error(`Invalid magic bytes: expected 0x5654, got 0x${magic.toString(16)}`);
  }

  // Read header
  const version = view.getUint8(offset++);
  if (version !== 0x01) {
    throw new Error(`Unsupported version: ${version}`);
  }

  const flags = view.getUint8(offset++);
  const cols = view.getUint32(offset, true);
  offset += 4;
  const rows = view.getUint32(offset, true);
  offset += 4;
  const viewportY = view.getInt32(offset, true);
  offset += 4;
  const cursorX = view.getInt32(offset, true);
  offset += 4;
  const cursorY = view.getInt32(offset, true);
  offset += 4;
  offset += 4; // Skip reserved bytes

  // Decode cells
  const cells: BufferCell[][] = [];

  while (offset < data.byteLength) {
    const marker = view.getUint8(offset++);

    if (marker === 0xfe) {
      // Empty row marker
      const count = view.getUint8(offset++);
      for (let i = 0; i < count; i++) {
        cells.push([{ char: ' ' }]);
      }
    } else if (marker === 0xfd) {
      // Row with content
      const cellCount = view.getUint16(offset, true);
      offset += 2;

      const row: BufferCell[] = [];
      for (let i = 0; i < cellCount; i++) {
        const cell = decodeCell(view, offset);
        row.push(cell.cell);
        offset = cell.newOffset;
      }
      cells.push(row);
    } else {
      throw new Error(`Unknown row marker: 0x${marker.toString(16)} at offset ${offset - 1}`);
    }
  }

  return {
    cols,
    rows,
    viewportY,
    cursorX,
    cursorY,
    cells,
  };
}

/**
 * Decode a single cell
 */
function decodeCell(
  view: DataView,
  offset: number
): { cell: BufferCell; newOffset: number } {
  const typeByte = view.getUint8(offset++);

  // Simple space (no extended data)
  if (typeByte === 0x00) {
    return {
      cell: { char: ' ' },
      newOffset: offset,
    };
  }

  const hasExtendedData = (typeByte & 0x80) !== 0;
  const isUnicode = (typeByte & 0x40) !== 0;
  const hasFg = (typeByte & 0x20) !== 0;
  const hasBg = (typeByte & 0x10) !== 0;
  const isRgbFg = (typeByte & 0x08) !== 0;
  const isRgbBg = (typeByte & 0x04) !== 0;
  const charType = typeByte & 0x03;

  const cell: BufferCell = { char: ' ' };

  // Decode character
  if (charType === 0x01) {
    // ASCII character
    cell.char = String.fromCharCode(view.getUint8(offset++));
  } else if (charType === 0x02 || isUnicode) {
    // Unicode character
    const length = view.getUint8(offset++);
    const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
    cell.char = new TextDecoder().decode(bytes);
    offset += length;
  }

  // Decode extended data
  if (hasExtendedData) {
    // Attributes byte
    const attrs = view.getUint8(offset++);
    if (attrs & 0x01) cell.bold = true;
    if (attrs & 0x02) cell.italic = true;
    if (attrs & 0x04) cell.underline = true;
    if (attrs & 0x08) cell.dim = true;
    if (attrs & 0x10) cell.inverse = true;
    if (attrs & 0x20) cell.invisible = true;
    if (attrs & 0x40) cell.strikethrough = true;

    // Foreground color
    if (hasFg) {
      if (isRgbFg) {
        const r = view.getUint8(offset++);
        const g = view.getUint8(offset++);
        const b = view.getUint8(offset++);
        cell.fg = (r << 16) | (g << 8) | b;
      } else {
        cell.fg = view.getUint8(offset++);
      }
    }

    // Background color
    if (hasBg) {
      if (isRgbBg) {
        const r = view.getUint8(offset++);
        const g = view.getUint8(offset++);
        const b = view.getUint8(offset++);
        cell.bg = (r << 16) | (g << 8) | b;
      } else {
        cell.bg = view.getUint8(offset++);
      }
    }
  }

  return {
    cell,
    newOffset: offset,
  };
}

/**
 * Convert decoded buffer to ANSI escape sequences for xterm.js
 *
 * Uses VirtualTerminalBuffer to maintain scrollback history and generate
 * incremental updates. This preserves xterm.js scrollback while keeping
 * the visible viewport synchronized with VibeTunnel's snapshots.
 */
export function bufferToAnsi(buffer: DecodedBuffer): string {
  return virtualBuffer.applySnapshot(buffer);
}

/**
 * Reset the virtual terminal buffer (call when switching sessions)
 */
export function resetVirtualBuffer(): void {
  virtualBuffer.reset();
}

/**
 * Decode VibeTunnel buffer and convert to xterm.js-compatible ANSI
 */
export function decodeVibeBufferToAnsi(data: ArrayBuffer): string {
  const buffer = decodeVibeBuffer(data);
  return bufferToAnsi(buffer);
}
