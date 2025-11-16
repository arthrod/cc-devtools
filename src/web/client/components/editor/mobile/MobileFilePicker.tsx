/**
 * Mobile file picker modal with search, tabs, and tree/list views
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, X, Star, StarOff, File, Clock, List, TreePine } from 'lucide-react';
import { FileIcon } from '../../common/FileIcon';
import { MobileFileTree } from './MobileFileTree';
import { Input } from '../../shared/FormField';
import { Button } from '../../shared/Button';

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileTreeNode[];
}

interface RecentFile {
  path: string;
  lastAccessed: string;
}

interface MobileFilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (filePath: string) => void;
  fileTree: FileTreeNode | null;
  recentFiles: RecentFile[];
  favoriteFiles: string[];
  onToggleFavorite: (filePath: string) => void;
  currentFilePath?: string;
}

interface FlattenedFile {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  isFavorite: boolean;
  isRecent: boolean;
  lastAccessed?: string;
}

export const MobileFilePicker: React.FC<MobileFilePickerProps> = ({
  isOpen,
  onClose,
  onFileSelect,
  fileTree,
  recentFiles,
  favoriteFiles,
  onToggleFavorite,
  currentFilePath
}) => {
  // Early return MUST be before any hooks
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');

  // Flatten file tree for searching
  const flattenedFiles = useMemo(() => {
    const files: FlattenedFile[] = [];

    const flatten = (node: FileTreeNode): void => {
      if (node.type === 'file') {
        files.push({
          path: node.path,
          name: node.name,
          type: node.type,
          size: node.size,
          modified: node.modified,
          isFavorite: favoriteFiles.includes(node.path),
          isRecent: recentFiles.some(rf => rf.path === node.path),
          lastAccessed: recentFiles.find(rf => rf.path === node.path)?.lastAccessed
        });
      }

      if (node.children) {
        node.children.forEach(child => flatten(child));
      }
    };

    if (fileTree) {
      flatten(fileTree);
    }

    return files;
  }, [fileTree, favoriteFiles, recentFiles]);

  // Filter files based on search and active tab
  const filteredFiles = useMemo(() => {
    let files = flattenedFiles;

    // Filter by tab
    switch (activeTab) {
      case 'recent':
        files = files.filter(f => f.isRecent);
        break;
      case 'favorites':
        files = files.filter(f => f.isFavorite);
        break;
      default:
        // Show all files
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      files = files.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.path.toLowerCase().includes(query)
      );
    }

    // Sort files: favorites first, then recent, then alphabetical
    return files.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      if (a.isRecent && !b.isRecent) return -1;
      if (!a.isRecent && b.isRecent) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [flattenedFiles, searchQuery, activeTab]);

  const handleFileSelect = useCallback((filePath: string) => {
    onFileSelect(filePath);
    onClose();
    setSearchQuery(''); // Clear search on selection
  }, [onFileSelect, onClose]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    onToggleFavorite(filePath);
  }, [onToggleFavorite]);

  const formatFileSize = useCallback((bytes: number | undefined) => {
    if (!bytes) return '';

    const units = ['B', 'KB', 'MB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)}${units[unitIndex]}`;
  }, []);

  const formatLastAccessed = useCallback((dateString: string | undefined) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }, []);

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Stop touch events from bubbling to parent components that might interfere with scrolling
    e.stopPropagation();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Allow normal scrolling by stopping propagation to parent touch handlers
    e.stopPropagation();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Stop touch events from bubbling to parent components
    e.stopPropagation();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Select File
        </h2>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewMode('tree')}
              className={`rounded-md ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              aria-label="Tree view"
            >
              <TreePine className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewMode('list')}
              className={`rounded-md ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close file picker"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Tabs - Only show in list view */}
      {viewMode === 'list' && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {(['all', 'recent', 'favorites'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-900 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'all' && 'All Files'}
              {tab === 'recent' && (
                <span className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  Recent
                </span>
              )}
              {tab === 'favorites' && (
                <span className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4" />
                  Favorites
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* File List or Tree */}
      <div
        className="flex-1 overflow-y-auto min-h-0"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y' // Allow vertical panning/scrolling only
        }}
      >
        {viewMode === 'tree' ? (
          <MobileFileTree
            fileTree={fileTree}
            onFileSelect={handleFileSelect}
            favoriteFiles={favoriteFiles}
            onToggleFavorite={onToggleFavorite}
            currentFilePath={currentFilePath}
            searchQuery={searchQuery}
          />
        ) : (
          // List view
          filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <File className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center">
                {searchQuery.trim() ? 'No files found' : `No ${activeTab} files`}
              </p>
              {searchQuery.trim() && (
                <p className="text-sm text-center mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <div className="py-2">
              {filteredFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(file.path)}
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    currentFilePath === file.path
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="mr-3 flex-shrink-0">
                      <FileIcon fileName={file.name} className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        {file.isFavorite && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                        )}
                        {file.isRecent && !file.isFavorite && (
                          <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {file.path}
                      </p>

                      <div className="flex items-center gap-3 mt-1">
                        {file.size && (
                          <span className="text-xs text-gray-400">
                            {formatFileSize(file.size)}
                          </span>
                        )}
                        {file.lastAccessed && (
                          <span className="text-xs text-gray-400">
                            {formatLastAccessed(file.lastAccessed)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => handleToggleFavorite(e, file.path)}
                    className="ml-2 flex-shrink-0"
                    aria-label={file.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {file.isFavorite ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
