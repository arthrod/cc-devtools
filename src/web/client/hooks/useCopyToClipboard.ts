import { useState } from 'react';

/**
 * Return type for the useCopyToClipboard hook.
 */
interface UseCopyToClipboardResult {
  copied: boolean;
  copyToClipboard: (text: string) => Promise<void>;
}

/**
 * Provides clipboard copy functionality with feedback state and fallback support.
 *
 * Uses modern Clipboard API when available in secure contexts, with graceful
 * fallback to deprecated execCommand for older browsers or non-HTTPS contexts.
 * The copied state automatically resets after 2 seconds for user feedback.
 */
export const useCopyToClipboard = (): UseCopyToClipboardResult => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback using deprecated execCommand for browsers lacking Clipboard API
        // or when running in non-secure contexts (HTTP, file://)
        const textArea = document.createElement('textarea');
        textArea.value = text;
        // Position off-screen to avoid visual flicker
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      // Auto-reset feedback state for consistent UX
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // Silently fail - copy operations should not disrupt user experience
    }
  };

  return { copied, copyToClipboard };
};
