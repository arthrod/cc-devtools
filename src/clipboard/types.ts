/**
 * Clipboard tool types
 */

/**
 * Parameters for clipboard_write tool
 */
export interface ClipboardWriteParams {
  content: string;
  format?: 'text' | 'html';
}

/**
 * Response from clipboard_write tool
 */
export interface ClipboardWriteResponse {
  success: boolean;
  message: string;
  length: number;
  format: string;
}
