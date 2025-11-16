import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { MermaidDiagram } from '../shared/MermaidDiagram';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Dual-mode markdown editor that displays rendered markdown when not focused,
 * and switches to a plain text editor when clicked. Supports mermaid diagrams.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  disabled = false,
  rows = 4,
  className = ''
}: MarkdownEditorProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [capturedHeight, setCapturedHeight] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleViewClick = (): void => {
    if (!disabled) {
      // Capture the actual rendered height of the preview before switching
      if (previewRef.current) {
        setCapturedHeight(previewRef.current.offsetHeight);
      }
      setIsEditing(true);
    }
  };

  const handleFocus = (): void => {
    if (!disabled && !isEditing) {
      // Capture the actual rendered height of the preview before switching
      if (previewRef.current) {
        setCapturedHeight(previewRef.current.offsetHeight);
      }
      setIsEditing(true);
    }
  };

  const handleBlur = (): void => {
    setIsEditing(false);
  };

  // Calculate minimum and maximum heights
  const minHeight = rows * 24 + 16; // rows * line-height + padding
  const maxHeight = Math.max(rows * 2, 12) * 24 + 16;

  if (isEditing) {
    // Use captured height if available, otherwise fall back to minHeight
    const editHeight = capturedHeight ?? minHeight;

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          height: `${editHeight}px`,
          maxHeight: `${maxHeight}px`
        }}
        className={`form-control font-mono text-sm leading-6 resize-y overflow-y-auto dark:text-gray-100 text-gray-900 markdown-editor ${className}`}
      />
    );
  }

  return (
    <div
      ref={previewRef}
      onClick={handleViewClick}
      onFocus={handleFocus}
      tabIndex={disabled ? -1 : 0}
      role="textbox"
      aria-label={placeholder}
      style={{
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`
      }}
      className={`w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded-md text-gray-900 dark:text-gray-100 cursor-text overflow-y-auto transition-all duration-200 markdown-editor focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
    >
      {value ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code({ className, children }: CodeBlockProps) {
                const match = /language-(\w+)/.exec(className ?? '');
                const language = match?.[1];
                const codeContent = String(children ?? '').replace(/\n$/, '');

                if (language === 'mermaid') {
                  return <MermaidDiagram chart={codeContent} className="my-4" />;
                }

                return (
                  <code className={className}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {value}
          </ReactMarkdown>
        </div>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
      )}
    </div>
  );
}
