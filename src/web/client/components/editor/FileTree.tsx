/**
 * File tree component for browsing project files
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react';
import { FileIcon } from '../common/FileIcon';
import { GitStatusIndicator } from './GitStatusIndicator';
import { useGitStatusMap } from '../../hooks/useGitStatus';

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

interface FileTreeProps {
  tree: FileTreeNode | null;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  className?: string;
}

interface FileTreeItemProps {
  node: FileTreeNode;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  expandedDirs: Set<string>;
  onDirToggle: (path: string) => void;
  level: number;
  gitStatusMap: Map<string, { path: string; status: string; staged: boolean; unstaged: boolean }>;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i ?? 0]}`;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  onFileSelect,
  selectedFile,
  expandedDirs,
  onDirToggle,
  level,
  gitStatusMap,
}) => {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedFile === node.path;
  const isDirectory = node.type === 'directory';

  // Get git status for this file
  const gitStatus = gitStatusMap.get(node.path);

  const handleClick = useCallback(() => {
    if (isDirectory) {
      onDirToggle(node.path);
    } else {
      onFileSelect(node.path);
    }
  }, [isDirectory, node.path, onDirToggle, onFileSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const indentationStyle = { paddingLeft: `${level * 16 + 8}px` };

  const getFileIcon = (): JSX.Element => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-400" />
      );
    }
    return <FileIcon fileName={node.name} className="w-4 h-4" />;
  };

  const getChevronIcon = (): JSX.Element | null => {
    if (!isDirectory || !node.children?.length) return null;

    return isExpanded ? (
      <ChevronDown className="w-3 h-3 text-gray-400" />
    ) : (
      <ChevronRight className="w-3 h-3 text-gray-400" />
    );
  };

  return (
    <>
      <div
        className={`
          flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
          text-sm select-none transition-colors duration-150
          ${
            isSelected
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
              : 'text-gray-700 dark:text-gray-300'
          }
        `}
        style={indentationStyle}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        <div className="flex items-center space-x-1 min-w-0 flex-1">
          <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
            {getChevronIcon()}
          </div>
          <div className="flex-shrink-0">{getFileIcon()}</div>
          <span className="truncate text-sm font-medium">{node.name}</span>

          <div className="flex items-center space-x-2 ml-auto">
            {/* Git status indicator */}
            {gitStatus && gitStatus.status !== 'clean' && (
              <GitStatusIndicator
                status={gitStatus.status as Parameters<typeof GitStatusIndicator>[0]['status']}
                staged={gitStatus.staged}
                unstaged={gitStatus.unstaged}
                size={12}
                showTooltip={true}
              />
            )}

            {/* File size */}
            {node.size !== undefined && !isDirectory && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatFileSize(node.size)}
              </span>
            )}
          </div>
        </div>
      </div>

      {isDirectory && isExpanded && node.children && (
        <div role="group">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              expandedDirs={expandedDirs}
              onDirToggle={onDirToggle}
              level={level + 1}
              gitStatusMap={gitStatusMap}
            />
          ))}
        </div>
      )}
    </>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  onFileSelect,
  selectedFile,
  className = '',
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['.']));

  // Load git status
  const { statusMap } = useGitStatusMap();

  const onDirToggle = useCallback((path: string): void => {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const sortedTree = useMemo(() => {
    if (!tree?.children) return tree;

    const sortChildren = (node: FileTreeNode): FileTreeNode => {
      if (!node.children) return node;

      const sortedChildren = [...node.children]
        .sort((a, b) => {
          // Directories first
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          // Then alphabetically
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        })
        .map(sortChildren);

      return { ...node, children: sortedChildren };
    };

    return sortChildren(tree);
  }, [tree]);

  if (!sortedTree) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No files found</p>
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}
      role="tree"
      aria-label="File tree"
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
          <Folder className="w-4 h-4 mr-2" />
          Files
        </h3>
      </div>

      <div className="py-1">
        {sortedTree?.children?.map((child) => (
          <FileTreeItem
            key={child.path}
            node={child}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
            expandedDirs={expandedDirs}
            onDirToggle={onDirToggle}
            level={0}
            gitStatusMap={statusMap}
          />
        ))}
      </div>
    </div>
  );
};
