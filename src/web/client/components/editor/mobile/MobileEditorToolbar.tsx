/**
 * Mobile editor toolbar with file navigation, edit actions, and view controls
 */

import React, { useState, useCallback } from 'react';
import {
  Save,
  Search,
  FileText,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../../shared/Button';

interface MobileEditorToolbarProps {
  onSave?: () => void;
  onSearch?: () => void;
  onFilePicker?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onPreviousFile?: () => void;
  onNextFile?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasPreviousFile?: boolean;
  hasNextFile?: boolean;
  isDirty?: boolean;
  currentFileName?: string;
  showLineNumbers?: boolean;
  onToggleLineNumbers?: () => void;
  wordWrap?: boolean;
  onToggleWordWrap?: () => void;
  fontSize?: number;
  readonly?: boolean;
}

export const MobileEditorToolbar: React.FC<MobileEditorToolbarProps> = ({
  onSave,
  onSearch,
  onFilePicker,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onPreviousFile,
  onNextFile,
  canUndo = false,
  canRedo = false,
  hasPreviousFile = false,
  hasNextFile = false,
  isDirty = false,
  currentFileName,
  showLineNumbers = true,
  onToggleLineNumbers,
  wordWrap = true,
  onToggleWordWrap,
  fontSize = 14,
  readonly = false
}) => {
  const [showSecondaryActions, setShowSecondaryActions] = useState(false);

  const handleAction = useCallback((action: (() => void) | undefined) => {
    return () => {
      action?.();
      setShowSecondaryActions(false); // Close menu after action
    };
  }, []);

  const getFileIcon = useCallback((fileName: string) => {
    if (!fileName) return '📄';

    const extension = fileName.toLowerCase().split('.').pop();

    switch (extension) {
      case 'ts':
      case 'tsx':
        return '📘';
      case 'js':
      case 'jsx':
        return '📄';
      case 'py':
        return '🐍';
      case 'css':
      case 'scss':
      case 'less':
        return '🎨';
      case 'html':
        return '🌐';
      case 'json':
        return '📋';
      case 'md':
      case 'mdx':
        return '📝';
      case 'yml':
      case 'yaml':
        return '⚙️';
      default:
        return '📄';
    }
  }, []);

  return (
    <>
      {/* Main Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1">
        {/* File Navigation Row */}
        <div className="flex items-center justify-between mb-2">
          {/* File Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onPreviousFile}
              disabled={!hasPreviousFile}
              aria-label="Previous file"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              onClick={onFilePicker}
              className="flex items-center gap-2 px-3 py-2 max-w-[200px]"
              aria-label="Open file picker"
            >
              <span className="text-lg">{getFileIcon(currentFileName ?? '')}</span>
              <span className="text-sm font-medium truncate">
                {currentFileName ?? 'Select file'}
              </span>
              {isDirty && (
                <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNextFile}
              disabled={!hasNextFile}
              aria-label="Next file"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-1">
            {!readonly && (
              <Button
                variant={isDirty ? 'primary' : 'ghost'}
                size="icon-sm"
                onClick={onSave}
                aria-label="Save file"
              >
                <Save className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSearch}
              aria-label="Search in file"
            >
              <Search className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSecondaryActions(!showSecondaryActions)}
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center justify-between">
          {/* Edit Actions */}
          {!readonly && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Undo"
              >
                <Undo className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Redo"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* View Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onZoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 min-w-[40px] text-center">
              {fontSize}px
            </span>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onZoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary Actions Menu */}
      {showSecondaryActions && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
          <div className="grid grid-cols-2 gap-2">
            {/* View Options */}
            <Button
              variant="ghost"
              onClick={handleAction(onToggleLineNumbers)}
              className="flex flex-col items-center gap-1 p-3 h-auto"
              aria-label={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
            >
              {showLineNumbers ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
              <span className="text-xs">Lines</span>
            </Button>

            <Button
              variant="ghost"
              onClick={handleAction(onToggleWordWrap)}
              className={`flex flex-col items-center gap-1 p-3 h-auto ${
                wordWrap ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              aria-label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">Wrap</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
