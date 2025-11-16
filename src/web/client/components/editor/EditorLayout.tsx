/**
 * Editor layout with resizable file tree and editor pane
 * Mobile: uses FilePicker modal, toolbar, and touch-optimized components
 */

import React, { useState, useCallback, useEffect, Suspense, lazy, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileTree } from './FileTree';
import { MobileFilePicker } from './mobile/MobileFilePicker';
import { MobileEditorToolbar } from './mobile/MobileEditorToolbar';
import { MobileContextMenu } from './mobile/MobileContextMenu';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useAppStore } from '../../stores/appStore';
import { useToast } from '../../hooks/useToast';

// Lazy load heavy editor components to reduce initial bundle size
const MonacoEditor = lazy(() => import('./MonacoEditor').then(m => ({ default: m.MonacoEditor })));
const CodeMirrorEditor = lazy(() => import('./CodeMirrorEditor').then(m => ({ default: m.CodeMirrorEditor })));

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
}

interface EditorLayoutProps {
  fileTree: FileTreeNode | null;
  selectedFile: string | null;
  fileContent: FileContent | null;
  isLoadingTree: boolean;
  isLoadingFile: boolean;
  fileError: string | null;
  isDirty: boolean;
  onFileSelect: (path: string) => void;
  onFileChange: (content: string) => void;
  onFileSave: () => void;
}

/**
 * Detect if viewport is mobile (< 768px)
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  fileTree,
  selectedFile,
  fileContent,
  isLoadingTree,
  isLoadingFile,
  fileError,
  isDirty,
  onFileSelect,
  onFileChange,
  onFileSave,
}) => {
  const isMobile = useIsMobile();
  const { showToast } = useToast();

  // App store for theme
  const darkMode = useAppStore(state => state.darkMode);

  // Mobile state
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [mobilePreferences, setMobilePreferences] = useState({
    showLineNumbers: true,
    wordWrap: true,
    fontSize: 14
  });

  // Editor ref for programmatic control
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Editor store for favorites and recent files
  const favoriteFiles = useEditorStore(state => state.favoriteFiles);
  const recentFiles = useEditorStore(state => state.recentFiles);
  const toggleFavorite = useEditorStore(state => state.toggleFavorite);

  const renderEditor = useCallback(() => {
    if (!selectedFile) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-lg font-medium">No file selected</p>
            <p className="text-sm mt-2">Select a file from the tree to edit</p>
          </div>
        </div>
      );
    }

    if (isLoadingFile) {
      return (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading file...</span>
        </div>
      );
    }

    if (fileError) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center text-red-600 dark:text-red-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="font-semibold">Failed to load file</p>
            <p className="text-sm mt-2">{fileError}</p>
          </div>
        </div>
      );
    }

    if (!fileContent) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>File content not available</p>
        </div>
      );
    }

    // Use CodeMirror for mobile, Monaco for desktop
    const Editor = isMobile ? CodeMirrorEditor : MonacoEditor;

    return (
      <div className="h-full flex flex-col">
        {/* File header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{fileContent.path}</span>
            {isDirty && <span className="text-blue-500 text-xs">● Modified</span>}
          </div>
          <button
            onClick={onFileSave}
            className={`
              flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
              ${
                isDirty
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
            disabled={!isDirty}
            title="Save file (Ctrl+S / Cmd+S)"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading editor...</span>
              </div>
            }
          >
            <Editor
              value={fileContent.content}
              language={fileContent.language}
              filePath={fileContent.path}
              onChange={onFileChange}
              onSave={onFileSave}
              theme={darkMode ? 'dark' : 'light'}
              fontSize={isMobile ? mobilePreferences.fontSize : 14}
              tabSize={2}
              readOnly={false}
              showLineNumbers={isMobile ? mobilePreferences.showLineNumbers : true}
              wordWrap={isMobile ? mobilePreferences.wordWrap : true}
            />
          </Suspense>
        </div>
      </div>
    );
  }, [
    selectedFile,
    isLoadingFile,
    fileError,
    fileContent,
    isDirty,
    isMobile,
    darkMode,
    mobilePreferences.fontSize,
    mobilePreferences.showLineNumbers,
    mobilePreferences.wordWrap,
    onFileChange,
    onFileSave,
  ]);

  // Mobile toolbar handlers
  const handleZoomIn = useCallback(() => {
    setMobilePreferences(prev => ({
      ...prev,
      fontSize: Math.min(prev.fontSize + 2, 24)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setMobilePreferences(prev => ({
      ...prev,
      fontSize: Math.max(prev.fontSize - 2, 10)
    }));
  }, []);

  const handleToggleLineNumbers = useCallback(() => {
    setMobilePreferences(prev => ({
      ...prev,
      showLineNumbers: !prev.showLineNumbers
    }));
  }, []);

  const handleToggleWordWrap = useCallback(() => {
    setMobilePreferences(prev => ({
      ...prev,
      wordWrap: !prev.wordWrap
    }));
  }, []);

  const handleSearch = useCallback(() => {
    if (!editorContainerRef.current) return;

    const cmEditor = editorContainerRef.current.querySelector('.cm-editor');
    if (cmEditor) {
      const searchEvent = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      cmEditor.dispatchEvent(searchEvent);
    }
  }, []);


  if (isLoadingTree) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading file tree...</span>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {/* Mobile Toolbar */}
        <MobileEditorToolbar
          onSave={onFileSave}
          onFilePicker={() => setShowFilePicker(true)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onToggleLineNumbers={handleToggleLineNumbers}
          onToggleWordWrap={handleToggleWordWrap}
          onSearch={handleSearch}
          isDirty={isDirty}
          currentFileName={selectedFile?.split('/').pop()}
          showLineNumbers={mobilePreferences.showLineNumbers}
          wordWrap={mobilePreferences.wordWrap}
          fontSize={mobilePreferences.fontSize}
          readonly={false}
        />

        {/* Editor */}
        <div ref={editorContainerRef} className="flex-1 overflow-hidden">
          {renderEditor()}
        </div>

        {/* File Picker Modal */}
        <MobileFilePicker
          isOpen={showFilePicker}
          onClose={() => setShowFilePicker(false)}
          onFileSelect={onFileSelect}
          fileTree={fileTree}
          recentFiles={recentFiles}
          favoriteFiles={favoriteFiles}
          onToggleFavorite={toggleFavorite}
          currentFilePath={selectedFile ?? undefined}
        />

        {/* Context Menu */}
        <MobileContextMenu
          isOpen={showContextMenu}
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
          wordWrap={mobilePreferences.wordWrap}
          onToggleWordWrap={handleToggleWordWrap}
          readonly={false}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-full">
      <PanelGroup direction="horizontal">
        {/* File Tree Panel */}
        <Panel defaultSize={20} minSize={15} maxSize={40}>
          <FileTree
            tree={fileTree}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile ?? undefined}
          />
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Editor Panel */}
        <Panel defaultSize={80} minSize={60}>
          {renderEditor()}
        </Panel>
      </PanelGroup>
    </div>
  );
};
