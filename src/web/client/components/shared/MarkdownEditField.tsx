import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Lazy load Mermaid diagram component to reduce initial bundle size
const MermaidDiagram = lazy(() => import('./MermaidDiagram').then(m => ({ default: m.MermaidDiagram })));

/**
 * Props for the MarkdownEditField component.
 */
interface MarkdownEditFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
}

/**
 * A dual-mode editor that displays markdown content as rendered HTML in read mode
 * and as editable text in edit mode. Supports GitHub Flavored Markdown and Mermaid diagrams.
 *
 * Click to enter edit mode, blur or ESC to save/cancel changes.
 */
export function MarkdownEditField({
  label,
  value,
  onChange,
  placeholder = 'Click to edit...',
  required = false,
  rows = 4,
  disabled = false
}: MarkdownEditFieldProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state with external value changes to prevent edit conflicts
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClick = (): void => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = (): void => {
    setIsEditing(false);
    onChange(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      setLocalValue(value); // Cancel edit without saving
      setIsEditing(false);
    }
  };

  // Auto-focus and position cursor at end when entering edit mode for better UX
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const hasContent = value.trim().length > 0;

  // Calculate consistent height for both modes based on rows
  // Each row is approximately 1.5rem (24px) with padding
  const calculatedHeight = `${rows * 1.5 + 1}rem`; // +1rem for padding

  return (
    <div>
      <label className={`form-label ${required ? 'form-label-required' : ''}`}>
        {label}
      </label>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          rows={rows}
          required={required}
          disabled={disabled}
          className="textarea break-words"
          placeholder={placeholder}
          style={{
            height: calculatedHeight,
            wordWrap: 'break-word',
            overflowWrap: 'anywhere'
          }}
        />
      ) : (
        <div
          onClick={handleClick}
          className={`
            w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md
            transition-all duration-200 font-ui text-sm overflow-hidden
            ${disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-text hover:border-neutral-400 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
            }
            ${hasContent
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
              : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
            }
          `}
          style={{
            height: calculatedHeight,
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            overflow: 'hidden',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere'
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              handleClick();
            }
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgb(241 107 90 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.05)';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
          }}
        >
          {hasContent ? (
            <div className="prose max-w-none dark:prose-invert overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ className, children, ...props }) => {
                    const language = className?.replace('language-', '');

                    // Render Mermaid diagrams instead of plain code blocks
                    if (language === 'mermaid') {
                      return (
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center py-4 bg-gray-800 rounded-lg">
                              <div className="text-gray-400">Loading diagram...</div>
                            </div>
                          }
                        >
                          <MermaidDiagram chart={String(children)} />
                        </Suspense>
                      );
                    }

                    return (
                      <code
                        className={`${className}`}
                        style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p: ({ children, ...props }) => (
                    <p
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        margin: '0 0 1em 0',
                        maxWidth: '100%'
                      }}
                      {...props}
                    >
                      {children}
                    </p>
                  ),
                  pre: ({ children, ...props }) => (
                    <pre
                      style={{
                        overflowX: 'auto',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        maxWidth: '100%'
                      }}
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                  div: ({ children, ...props }) => (
                    <div style={{ maxWidth: '100%', wordBreak: 'break-word' }} {...props}>
                      {children}
                    </div>
                  )
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-neutral-500 dark:text-neutral-400 italic">
              {placeholder}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
