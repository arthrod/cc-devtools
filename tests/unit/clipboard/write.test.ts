import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { writeToClipboard } from '../../../src/clipboard/tools/write.js';

// Mock clipboardy
vi.mock('clipboardy', () => ({
  default: {
    write: vi.fn(),
  },
}));

import clipboard from 'clipboardy';

describe('Clipboard write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeToClipboard', () => {
    it('should write text content to clipboard', async () => {
      const content = 'Hello, World!';
      vi.mocked(clipboard.write).mockResolvedValue();

      const result = await writeToClipboard({ content });

      expect(clipboard.write).toHaveBeenCalledWith(content);
      expect(result).toEqual({
        success: true,
        message: 'Content copied to clipboard',
        length: content.length,
        format: 'text',
      });
    });

    it('should handle multiline content', async () => {
      const content = 'Line 1\nLine 2\nLine 3';
      vi.mocked(clipboard.write).mockResolvedValue();

      const result = await writeToClipboard({ content });

      expect(clipboard.write).toHaveBeenCalledWith(content);
      expect(result).toEqual({
        success: true,
        message: 'Content copied to clipboard',
        length: content.length,
        format: 'text',
      });
    });

    it('should handle large content', async () => {
      const content = 'x'.repeat(100000);
      vi.mocked(clipboard.write).mockResolvedValue();

      const result = await writeToClipboard({ content });

      expect(clipboard.write).toHaveBeenCalledWith(content);
      expect(result).toEqual({
        success: true,
        message: 'Content copied to clipboard',
        length: 100000,
        format: 'text',
      });
    });

    it('should throw error for empty content', async () => {
      await expect(writeToClipboard({ content: '' })).rejects.toThrow('Content is required');
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        writeToClipboard({ content: 'test', format: 'json' as 'text' })
      ).rejects.toThrow('Unsupported format: json');
    });

    it('should throw error when HTML format is requested', async () => {
      await expect(
        writeToClipboard({ content: 'test', format: 'html' })
      ).rejects.toThrow('HTML format is not yet supported');
    });

    it('should handle clipboard write failure', async () => {
      vi.mocked(clipboard.write).mockRejectedValue(new Error('Clipboard access denied'));

      await expect(writeToClipboard({ content: 'test' })).rejects.toThrow(
        'Failed to write to clipboard: Clipboard access denied'
      );
    });

    it('should default to text format when format not specified', async () => {
      const content = 'Default format test';
      vi.mocked(clipboard.write).mockResolvedValue();

      const result = await writeToClipboard({ content });

      expect(result.format).toBe('text');
    });

    it('should handle special characters', async () => {
      const content = 'Special: "quotes", \'apostrophes\', <tags>, & ampersands';
      vi.mocked(clipboard.write).mockResolvedValue();

      const result = await writeToClipboard({ content });

      expect(clipboard.write).toHaveBeenCalledWith(content);
      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters', async () => {
      const content = '你好 🌍 Привет مرحبا';
      vi.mocked(clipboard.write).mockResolvedValue();

      const result = await writeToClipboard({ content });

      expect(clipboard.write).toHaveBeenCalledWith(content);
      expect(result.success).toBe(true);
    });
  });
});
