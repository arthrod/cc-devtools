/**
 * Mobile-optimized file tree component with touch-friendly interactions
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Star, StarOff } from 'lucide-react';
import { FileIcon } from '../../common/FileIcon';
import { Button } from '../../shared/Button';

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileTreeNode[];
}

interface MobileFileTreeProps {
  fileTree: FileTreeNode | null;
  onFileSelect: (filePath: string) => void;
  favoriteFiles: string[];
  onToggleFavorite: (filePath: string) => void;
  currentFilePath?: string;
  searchQuery?: string;
}

interface TreeNodeProps {
  node: FileTreeNode;
  level: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileSelect: (filePath: string) => void;
  favoriteFiles: string[];
  onToggleFavorite: (filePath: string) => void;
  currentFilePath?: string;
  searchQuery?: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  expandedPaths,
  onToggle,
  onFileSelect,
  favoriteFiles,
  onToggleFavorite,
  currentFilePath,
  searchQuery
}) => {
  const isDirectory = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;
  const isFavorite = favoriteFiles.includes(node.path);
  const isCurrentFile = currentFilePath === node.path;
  const isExpanded = expandedPaths.has(node.path);
  const indentPx = level * 20;

  // Highlight search matches
  const isSearchMatch = searchQuery &&
    (node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     node.path.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleNodeClick = useCallback(() => {
    if (isDirectory && hasChildren) {
      onToggle(node.path);
    } else if (!isDirectory) {
      onFileSelect(node.path);
    }
  }, [isDirectory, hasChildren, node.path, onToggle, onFileSelect]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(node.path);
  }, [node.path, onToggleFavorite]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="select-none">
      {/* Node Item */}
      <div
        className={`
          flex items-center py-3 px-3 min-h-[56px] touch-manipulation
          ${isCurrentFile
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
          ${isSearchMatch
            ? 'bg-yellow-50 dark:bg-yellow-900/20'
            : ''}
          active:bg-gray-100 dark:active:bg-gray-700
          transition-colors duration-150
        `}
        style={{ paddingLeft: `${12 + indentPx}px` }}
        onClick={handleNodeClick}
      >
        {/* Expand/Collapse Icon */}
        {isDirectory && hasChildren && (
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </div>
        )}

        {/* File/Folder Icon */}
        <div className="flex-shrink-0 mr-3">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="w-5 h-5 text-blue-500" />
            ) : (
              <Folder className="w-5 h-5 text-blue-500" />
            )
          ) : (
            <FileIcon fileName={node.name} className="w-5 h-5" />
          )}
        </div>

        {/* File/Folder Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={`
                text-sm font-medium truncate
                ${isCurrentFile
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-900 dark:text-white'}
                ${isSearchMatch
                  ? 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded'
                  : ''}
              `}
            >
              {node.name}
            </span>

            {/* Favorite Button */}
            {!isDirectory && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleFavoriteClick}
                className={`
                  rounded-full touch-manipulation
                  ${isFavorite
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-gray-600'}
                `}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? (
                  <Star className="w-4 h-4 fill-current" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          {/* File Details */}
          {!isDirectory && (node.size ?? node.modified) && (
            <div className="flex items-center space-x-3 mt-1">
              {node.size && (
                <span className="text-xs text-gray-500">
                  {formatFileSize(node.size)}
                </span>
              )}
              {node.modified && (
                <span className="text-xs text-gray-500">
                  {formatDate(node.modified)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {isDirectory && hasChildren && isExpanded && node.children && (
        <div className="border-l border-gray-200 dark:border-gray-700 ml-6">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onFileSelect={onFileSelect}
              favoriteFiles={favoriteFiles}
              onToggleFavorite={onToggleFavorite}
              currentFilePath={currentFilePath}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MobileFileTree: React.FC<MobileFileTreeProps> = ({
  fileTree,
  onFileSelect,
  favoriteFiles,
  onToggleFavorite,
  currentFilePath,
  searchQuery
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (fileTree) {
      initial.add(fileTree.path);
    }
    return initial;
  });

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  }, []);

  // Auto-expand path to current file
  useMemo(() => {
    if (currentFilePath && fileTree) {
      const pathParts = currentFilePath.split('/');
      const newExpanded = new Set(expandedPaths);

      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (i === 0 ? '' : '/') + pathParts[i];
        if (currentPath) {
          newExpanded.add(currentPath);
        }
      }

      setExpandedPaths(newExpanded);
    }
  }, [currentFilePath, fileTree]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery || !fileTree) return fileTree;

    const filterNode = (node: FileTreeNode): FileTreeNode | null => {
      const matchesSearch =
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.path.toLowerCase().includes(searchQuery.toLowerCase());

      if (node.type === 'file') {
        return matchesSearch ? node : null;
      }

      // For directories, include if any children match
      const filteredChildren = node.children
        ?.map(child => filterNode(child))
        .filter(Boolean) as FileTreeNode[] ?? [];

      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }

      return null;
    };

    return filterNode(fileTree);
  }, [fileTree, searchQuery]);

  if (!filteredTree) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <File className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Files Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery
            ? `No files match "${searchQuery}"`
            : 'No files available to display'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      <TreeNode
        node={filteredTree}
        level={0}
        expandedPaths={expandedPaths}
        onToggle={handleToggle}
        onFileSelect={onFileSelect}
        favoriteFiles={favoriteFiles}
        onToggleFavorite={onToggleFavorite}
        currentFilePath={currentFilePath}
        searchQuery={searchQuery}
      />
    </div>
  );
};
