import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { Eye, Download, ExternalLink, Image, FileText, AlertTriangle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Lazy load Mermaid diagram component to reduce initial bundle size
const MermaidDiagram = lazy(() => import('../shared/MermaidDiagram').then(m => ({ default: m.MermaidDiagram })));

interface FilePreviewProps {
  filePath: string;
  fileContent: string;
  fileSize: number;
  onEdit?: () => void;
  onDownload?: () => void;
  className?: string;
}

type PreviewType = 'text' | 'image' | 'markdown' | 'unsupported';

export const FilePreview: React.FC<FilePreviewProps> = ({
  filePath,
  fileContent,
  fileSize,
  onEdit,
  onDownload,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const previewType = useMemo((): PreviewType => {
    const extension = filePath.toLowerCase().split('.').pop() ?? '';

    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
    if (imageTypes.includes(extension)) {
      return 'image';
    }

    const markdownTypes = ['md', 'mdx', 'markdown'];
    if (markdownTypes.includes(extension)) {
      return 'markdown';
    }

    const textTypes = [
      'txt',
      'log',
      'csv',
      'tsv',
      'yaml',
      'yml',
      'json',
      'xml',
      'html',
      'css',
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'rb',
      'php',
      'java',
      'c',
      'cpp',
      'h',
      'hpp',
      'cs',
      'go',
      'rs',
      'swift',
      'kt',
      'scala',
      'clj',
      'hs',
      'ml',
      'fs',
      'sql',
      'sh',
      'bash',
      'zsh',
      'fish',
      'ps1',
      'bat',
      'cmd',
      'dockerfile',
      'makefile',
      'gitignore',
      'gitattributes',
      'gitmodules',
      'env',
      'ini',
      'conf',
      'toml',
      'lock',
      'editorconfig',
      'eslintrc',
      'prettierrc',
      'npmrc',
      'yarnrc',
      'babelrc',
      'postcssrc',
    ];
    if (textTypes.includes(extension)) {
      return 'text';
    }

    return 'unsupported';
  }, [filePath]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i ?? 0]}`;
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageError(false);
  }, []);

  const createImageUrl = useCallback((content: string, path: string): string => {
    if (content.startsWith('data:')) {
      return content;
    }

    return `/api/files${path}`;
  }, []);

  const renderImagePreview = (): JSX.Element => {
    if (imageError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
          <p className="text-center">Failed to load image</p>
          <p className="text-sm text-center mt-1">The image may be corrupted or too large</p>
        </div>
      );
    }

    const imageUrl = createImageUrl(fileContent, filePath);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800">
          <div className="relative max-w-full max-h-full">
            <img
              src={imageUrl}
              alt={filePath.split('/').pop()}
              className="max-w-full max-h-full object-contain rounded shadow-lg cursor-pointer"
              onError={handleImageError}
              onLoad={handleImageLoad}
              onClick={() => setIsFullscreen(true)}
            />
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity"
              title="View fullscreen"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{filePath.split('/').pop()}</span>
            <span>{formatFileSize(fileSize)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMarkdownPreview = (): JSX.Element => {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
          <div className="prose prose-sm max-w-none dark:prose-invert">
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
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {fileContent}
            </ReactMarkdown>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              Markdown Preview
            </span>
            <span>{formatFileSize(fileSize)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTextPreview = (): JSX.Element => {
    const MAX_PREVIEW_LENGTH = 10000;
    const truncatedContent =
      fileContent.length > MAX_PREVIEW_LENGTH
        ? fileContent.substring(0, MAX_PREVIEW_LENGTH) + '\n\n... (content truncated)'
        : fileContent;

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-full">
            {truncatedContent}
          </pre>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Text Preview</span>
            <span>{formatFileSize(fileSize)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderUnsupportedPreview = (): JSX.Element => {
    const extension = filePath.split('.').pop()?.toUpperCase() ?? 'FILE';

    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-lg font-medium mb-2">{extension} File</p>
          <p className="text-sm mb-4">Preview not available for this file type</p>
          <p className="text-xs text-gray-400 mb-6">{formatFileSize(fileSize)}</p>

          <div className="flex space-x-3">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Open in Editor
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPreview = (): JSX.Element => {
    switch (previewType) {
      case 'image':
        return renderImagePreview();
      case 'markdown':
        return renderMarkdownPreview();
      case 'text':
        return renderTextPreview();
      case 'unsupported':
      default:
        return renderUnsupportedPreview();
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          {previewType === 'image' && <Image className="w-4 h-4 text-green-500" />}
          {previewType === 'markdown' && <FileText className="w-4 h-4 text-blue-500" />}
          {previewType === 'text' && <FileText className="w-4 h-4 text-gray-500" />}
          {previewType === 'unsupported' && <FileText className="w-4 h-4 text-red-500" />}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {filePath.split('/').pop()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="Open in editor"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">{renderPreview()}</div>

      {/* Fullscreen Modal for Images */}
      {isFullscreen && previewType === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={createImageUrl(fileContent, filePath)}
              alt={filePath.split('/').pop()}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
