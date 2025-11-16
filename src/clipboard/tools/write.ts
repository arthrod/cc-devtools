/**
 * Clipboard write handler
 */

import clipboard from 'clipboardy';

import type { ClipboardWriteParams, ClipboardWriteResponse } from '../types.js';

/**
 * Write content to system clipboard
 * @param params - Content and optional format
 * @returns Response with success status and metadata
 */
export async function writeToClipboard(params: ClipboardWriteParams): Promise<ClipboardWriteResponse> {
  const { content, format = 'text' } = params;

  if (!content) {
    throw new Error('Content is required');
  }

  if (format !== 'text' && format !== 'html') {
    throw new Error(`Unsupported format: ${String(format)}. Only 'text' and 'html' are supported.`);
  }

  if (format === 'html') {
    throw new Error('HTML format is not yet supported. Use format="text" or omit the format parameter.');
  }

  try {
    await clipboard.write(content);

    return {
      success: true,
      message: 'Content copied to clipboard',
      length: content.length,
      format
    };
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to write to clipboard: ${err.message}`);
  }
}
