/**
 * Terminal Buffer Service
 *
 * Fetches and decodes terminal buffer snapshots from VibeTunnel backend.
 * Used to restore terminal scrollback history when remounting terminals.
 *
 * Binary format decoder adapted from VibeTunnel's terminal-renderer.ts
 */

import { getAuthToken } from './api.service';

/**
 * Terminal buffer cell with styling information
 */
export interface BufferCell {
  char: string;
  width: number;
  fg?: number;
  bg?: number;
  attributes?: number;
}

/**
 * Terminal buffer snapshot decoded from binary format
 */
export interface TerminalBufferSnapshot {
  cols: number;
  rows: number;
  viewportY: number;
  cursorX: number;
  cursorY: number;
  cells: BufferCell[][];
}

/**
 * Fetch terminal buffer snapshot from backend
 *
 * Retrieves the current terminal buffer state including scrollback history.
 * This allows restoring the terminal display when remounting components.
 *
 * @param sessionId - Session ID to fetch buffer for
 * @returns Decoded terminal buffer snapshot
 * @throws Error if fetch fails or buffer cannot be decoded
 */
export async function fetchTerminalBuffer(
  sessionId: string
): Promise<TerminalBufferSnapshot> {
  // Call VibeTunnel's buffer endpoint
  const token = getAuthToken();
  const response = await fetch(`/api/sessions/${sessionId}/buffer`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch terminal buffer: ${response.status} ${response.statusText}`
    );
  }

  // Response is binary (application/octet-stream)
  const arrayBuffer = await response.arrayBuffer();

  // Decode binary buffer
  return decodeBinaryBuffer(arrayBuffer);
}

/**
 * Decode binary terminal buffer format (VibeTunnel's binary protocol)
 *
 * Header (32 bytes):
 * - 2 bytes: Magic "VT" (0x5654)
 * - 1 byte: Version (0x01)
 * - 1 byte: Flags
 * - 4 bytes: cols (uint32)
 * - 4 bytes: rows (uint32)
 * - 4 bytes: viewportY (int32)
 * - 4 bytes: cursorX (int32)
 * - 4 bytes: cursorY (int32)
 * - 4 bytes: Reserved
 *
 * Cells encoded with markers:
 * - 0xFE: Empty row marker
 * - 0xFD: Row with content marker
 *
 * @param buffer - Raw binary buffer from API
 * @returns Decoded buffer snapshot
 */
function decodeBinaryBuffer(buffer: ArrayBuffer): TerminalBufferSnapshot {
  const view = new DataView(buffer);
  let offset = 0;

  // Read header
  const magic = view.getUint16(offset, true);
  offset += 2;
  if (magic !== 0x5654) {
    throw new Error('Invalid buffer format');
  }

  const version = view.getUint8(offset++);
  if (version !== 0x01) {
    throw new Error(`Unsupported buffer version: ${version}`);
  }

  offset++; // Skip flags
  const cols = view.getUint32(offset, true);
  offset += 4;
  const rows = view.getUint32(offset, true);
  offset += 4;
  const viewportY = view.getInt32(offset, true); // Signed
  offset += 4;
  const cursorX = view.getInt32(offset, true); // Signed
  offset += 4;
  const cursorY = view.getInt32(offset, true); // Signed
  offset += 4;
  offset += 4; // Skip reserved

  // Decode cells
  const cells: BufferCell[][] = [];
  const uint8 = new Uint8Array(buffer);

  // Optimized format
  while (offset < uint8.length) {
    const marker = uint8[offset++];

    if (marker === 0xfe) {
      // Empty row(s)
      const count = uint8[offset++];
      for (let i = 0; i < count; i++) {
        cells.push([{ char: ' ', width: 1 }]);
      }
    } else if (marker === 0xfd) {
      // Row with content
      const cellCount = view.getUint16(offset, true);
      offset += 2;

      const rowCells: BufferCell[] = [];
      for (let i = 0; i < cellCount; i++) {
        const result = decodeCell(uint8, offset);
        offset = result.offset;
        rowCells.push(result.cell);
      }
      cells.push(rowCells);
    }
  }

  return { cols, rows, viewportY, cursorX, cursorY, cells };
}

/**
 * Decode a single terminal cell from binary format
 *
 * Type byte format:
 * - Bit 7: Has extended data (attrs/colors)
 * - Bit 6: Is Unicode (vs ASCII)
 * - Bit 5: Has foreground color
 * - Bit 4: Has background color
 * - Bit 3: Is RGB foreground (vs palette)
 * - Bit 2: Is RGB background (vs palette)
 * - Bits 1-0: Character type (00=space, 01=ASCII, 10=Unicode)
 *
 * @param uint8 - Byte array containing cell data
 * @param offset - Current offset in byte array
 * @returns Decoded cell and new offset
 */
function decodeCell(uint8: Uint8Array, offset: number): { cell: BufferCell; offset: number } {
  const typeByte = uint8[offset++];

  const hasExtended = !!(typeByte & 0x80);
  const isUnicode = !!(typeByte & 0x40);
  const hasFg = !!(typeByte & 0x20);
  const hasBg = !!(typeByte & 0x10);
  const isRgbFg = !!(typeByte & 0x08);
  const isRgbBg = !!(typeByte & 0x04);
  const charType = typeByte & 0x03;

  // Simple space
  if (typeByte === 0x00) {
    return {
      cell: { char: ' ', width: 1 },
      offset,
    };
  }

  // Read character
  let char: string;
  if (charType === 0x00) {
    char = ' ';
  } else if (isUnicode) {
    const charLen = uint8[offset++];
    const charBytes = uint8.slice(offset, offset + charLen);
    char = new TextDecoder().decode(charBytes);
    offset += charLen;
  } else {
    char = String.fromCharCode(uint8[offset++]);
  }

  // Default cell
  const cell: BufferCell = { char, width: 1 };

  // Read extended data if present
  if (hasExtended) {
    // Attributes
    const attributes = uint8[offset++];
    if (attributes !== 0) {
      cell.attributes = attributes;
    }

    // Foreground color
    if (hasFg) {
      if (isRgbFg) {
        cell.fg = (uint8[offset] << 16) | (uint8[offset + 1] << 8) | uint8[offset + 2];
        offset += 3;
      } else {
        cell.fg = uint8[offset++];
      }
    }

    // Background color
    if (hasBg) {
      if (isRgbBg) {
        cell.bg = (uint8[offset] << 16) | (uint8[offset + 1] << 8) | uint8[offset + 2];
        offset += 3;
      } else {
        cell.bg = uint8[offset++];
      }
    }
  }

  return { cell, offset };
}

/**
 * Convert buffer snapshot to plain text for xterm.js
 *
 * Converts the cell grid to plain text that can be written to xterm.js.
 * Preserves ANSI escape sequences for colors and styling.
 *
 * @param snapshot - Buffer snapshot to convert
 * @returns Text content with ANSI codes for xterm.js
 */
export function bufferSnapshotToText(snapshot: TerminalBufferSnapshot): string {
  const lines: string[] = [];

  for (const row of snapshot.cells) {
    let line = '';
    for (const cell of row) {
      // For now, just use plain characters
      // TODO: Add ANSI escape codes for colors/attributes if needed
      line += cell.char;
    }
    lines.push(line);
  }

  return lines.join('\r\n');
}
