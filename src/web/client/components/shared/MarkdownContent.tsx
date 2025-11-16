import { Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MermaidDiagram = lazy(() => import('./MermaidDiagram').then(m => ({ default: m.MermaidDiagram })));

interface MarkdownContentProps {
  content: string;
  scrollable?: boolean;
  className?: string;
}

/**
 * Renders markdown content with GitHub Flavored Markdown and Mermaid diagram support.
 * Optionally wraps content in a scrollable container.
 */
export function MarkdownContent({ content, scrollable = false, className = '' }: MarkdownContentProps): JSX.Element {
  const markdownComponents = {
    code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
      const language = className?.replace('language-', '');

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
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  const containerClasses = [
    'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3',
    scrollable ? 'max-h-96 overflow-y-auto' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
