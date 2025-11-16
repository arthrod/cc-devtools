import React, { useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

/**
 * Props for the CodeBlock component.
 */
interface CodeBlockProps {
  children: React.ReactNode;
  className?: string | undefined;
  /** When true, renders as inline code without copy functionality */
  isInline?: boolean;
}

/**
 * Renders code content with syntax highlighting and copy functionality.
 * Supports both inline code snippets and block-level code with hover-to-copy.
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, isInline = false }) => {
  const { copied, copyToClipboard } = useCopyToClipboard();
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);

  /**
   * Extracts text content from children and copies to clipboard.
   */
  const handleCopy = async (): Promise<void> => {
    const codeText = typeof children === 'string' ? children : children?.toString() ?? '';
    await copyToClipboard(codeText);
    setShowCopiedFeedback(true);
    setTimeout(() => setShowCopiedFeedback(false), 2000);
  };

  const handleTouchStart = (e: React.TouchEvent): void => {
    // Prevent event from propagating to parent chat message
    e.stopPropagation();
    e.preventDefault();

    // Store initial touch position
    const touch = e.touches[0];
    if (touch) {
      touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };
    }

    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      void handleCopy();
      setIsLongPressing(false);
    }, 800);
  };

  const handleTouchEnd = (e: React.TouchEvent): void => {
    e.stopPropagation();
    setIsLongPressing(false);
    touchStartPositionRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    e.stopPropagation();

    // Cancel long press if finger moves too much (user is scrolling/dragging)
    if (touchStartPositionRef.current) {
      const touch = e.touches[0];
      if (touch) {
        const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);

        // If movement exceeds threshold (10px in any direction), cancel long press
        if (deltaX > 10 || deltaY > 10) {
          setIsLongPressing(false);
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }
    }
  };

  if (isInline) {
    return (
      <code className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <pre
        className={`bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg overflow-x-auto text-sm my-2 transition-all duration-200 select-none sm:select-text border border-gray-200 dark:border-gray-600 ${
          isLongPressing
            ? 'scale-105 shadow-lg ring-2 ring-green-500 ring-opacity-30'
            : ''
        } ${
          showCopiedFeedback
            ? 'ring-2 ring-green-500 ring-opacity-50'
            : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <code className={className}>
          {children}
        </code>
      </pre>

      {/* Copied feedback indicator - mobile only, fixed to viewport */}
      {showCopiedFeedback && (
        <div className="sm:hidden fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-base font-medium shadow-xl flex items-center gap-2 animate-pulse">
            <Check size={20} />
            Code Copied!
          </div>
        </div>
      )}

      {/* Copy button hidden on mobile, shows on hover on desktop */}
      <button
        onClick={() => void handleCopy()}
        className="hidden sm:flex absolute top-2 right-2 p-2 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500 rounded-md transition-colors duration-200 items-center justify-center opacity-0 group-hover:opacity-90 shadow-sm"
        title={copied ? 'Copied!' : 'Copy code'}
        aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
      >
        {copied ? (
          <Check size={16} className="text-green-600 dark:text-green-400" />
        ) : (
          <Copy size={16} className="text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-white" />
        )}
      </button>
    </div>
  );
};
