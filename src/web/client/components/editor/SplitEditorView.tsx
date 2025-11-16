import React, { useCallback, Suspense, lazy } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { X, Maximize2 } from 'lucide-react';
import { LoadingSpinner, ErrorMessage } from '../shared';
import { Breadcrumb } from './Breadcrumb';
import { FileIcon } from '../common/FileIcon';
import { useEditorStore } from '../../stores/editorStore';

// Lazy load Monaco editor to reduce initial bundle size
const MonacoEditor = lazy(() => import('./MonacoEditor').then(m => ({ default: m.MonacoEditor })));

interface SplitEditorViewProps {
  onFileChange: (path: string, content: string) => void;
  onFileSave: (path: string) => void;
  onExpandDirectory?: (path: string) => void;
  className?: string;
}

export const SplitEditorView: React.FC<SplitEditorViewProps> = ({
  onFileChange,
  onFileSave,
  onExpandDirectory,
  className = '',
}) => {
  const splitView = useEditorStore((state) => state.splitView);
  const openFiles = useEditorStore((state) => state.openFiles);
  const dirtyFiles = useEditorStore((state) => state.dirtyFiles);
  const preferences = useEditorStore((state) => state.preferences);
  const disableSplitView = useEditorStore((state) => state.disableSplitView);
  const setSplitFiles = useEditorStore((state) => state.setSplitFiles);

  const handleMaximize = useCallback(
    (pane: 'left' | 'right') => {
      if (pane === 'left') {
        if (splitView.rightFile) {
          disableSplitView();
        }
      } else {
        if (splitView.leftFile && splitView.rightFile) {
          setSplitFiles(splitView.rightFile, null);
          disableSplitView();
        }
      }
    },
    [splitView, disableSplitView, setSplitFiles]
  );

  const handleClosePane = useCallback(
    (pane: 'left' | 'right') => {
      if (pane === 'right') {
        setSplitFiles(splitView.leftFile, null);
        disableSplitView();
      }
    },
    [splitView, setSplitFiles, disableSplitView]
  );

  const renderEditorPane = useCallback(
    (filePath: string | null, pane: 'left' | 'right') => {
      if (!filePath) {
        return (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2">📄</div>
              <p className="text-sm">No file open in this pane</p>
            </div>
          </div>
        );
      }

      const file = openFiles.get(filePath);
      const isDirty = dirtyFiles.has(filePath);
      const fileName = filePath.split('/').pop() ?? filePath;

      return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
          {/* Pane Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <FileIcon fileName={fileName} className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {fileName}
                {isDirty && <span className="text-blue-500 ml-1">•</span>}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleMaximize(pane)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                title="Maximize pane"
              >
                <Maximize2 className="w-3 h-3" />
              </button>

              {pane === 'right' && (
                <button
                  onClick={() => handleClosePane(pane)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Close pane"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumb */}
          {onExpandDirectory && (
            <div className="px-3 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Breadcrumb filePath={filePath} onNavigate={onExpandDirectory} showHomeIcon={true} maxItems={4} className="text-xs" />
            </div>
          )}

          {/* Editor Content */}
          <div className="flex-1 relative">
            {!file ? (
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading file...</span>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <LoadingSpinner size="md" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading editor...</span>
                  </div>
                }
              >
                <MonacoEditor
                  value={file.content}
                  language={file.language}
                  onChange={(value) => value !== undefined && onFileChange(filePath, value)}
                  onSave={() => onFileSave(filePath)}
                  theme={preferences.theme}
                  options={{
                    fontSize: preferences.fontSize,
                    tabSize: preferences.tabSize,
                    wordWrap: preferences.wordWrap ? 'on' : 'off',
                    minimap: { enabled: preferences.minimap },
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>
      );
    },
    [openFiles, dirtyFiles, preferences, onFileChange, onFileSave, onExpandDirectory, handleMaximize, handleClosePane]
  );

  if (!splitView.enabled || !splitView.leftFile) {
    return (
      <div className={`h-full ${className}`}>
        <ErrorMessage message="Split view is not enabled or no files are open" />
      </div>
    );
  }

  // Single pane (left only)
  if (!splitView.rightFile) {
    return <div className={`h-full ${className}`}>{renderEditorPane(splitView.leftFile, 'left')}</div>;
  }

  // Two panes
  return (
    <div className={`h-full ${className}`}>
      <PanelGroup direction={splitView.orientation}>
        <Panel defaultSize={splitView.leftSize} minSize={20}>
          {renderEditorPane(splitView.leftFile, 'left')}
        </Panel>

        <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" />

        <Panel defaultSize={100 - splitView.leftSize} minSize={20}>
          {renderEditorPane(splitView.rightFile, 'right')}
        </Panel>
      </PanelGroup>
    </div>
  );
};
