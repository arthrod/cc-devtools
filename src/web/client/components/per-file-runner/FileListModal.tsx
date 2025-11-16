import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Search, X } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { useResetFile } from '../../hooks/usePerFileRunner.js';
import type { FileState, FileStatus } from '../../../../web/shared/types/per-file-runner.js';

interface FileListModalProps {
  isOpen: boolean;
  onClose: () => void;
  configId: string;
  configName: string;
  files: FileState[];
}

interface GroupedFiles {
  new: FileState[];
  'out-of-date': FileState[];
  'up-to-date': FileState[];
}

/**
 * Modal for viewing and managing all files for a config.
 * Groups files by status with search/filter and reset functionality.
 */
export function FileListModal({ isOpen, onClose, configId, configName, files }: FileListModalProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<FileStatus>>(
    new Set(['new', 'out-of-date', 'up-to-date'])
  );

  const { mutate: resetFile, isPending: isResetting } = useResetFile();

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter((file) => file.file.toLowerCase().includes(query));
  }, [files, searchQuery]);

  const groupedFiles = useMemo(() => {
    const grouped: GroupedFiles = {
      new: [],
      'out-of-date': [],
      'up-to-date': [],
    };

    filteredFiles.forEach((file) => {
      grouped[file.last_state].push(file);
    });

    return grouped;
  }, [filteredFiles]);

  const toggleSection = (status: FileStatus): void => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const handleResetFile = (file: string): void => {
    resetFile({ id: configId, file });
  };

  const getSectionColor = (status: FileStatus): string => {
    switch (status) {
      case 'new':
        return 'text-blue-700 dark:text-blue-400';
      case 'out-of-date':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'up-to-date':
        return 'text-green-700 dark:text-green-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  const getSectionLabel = (status: FileStatus): string => {
    switch (status) {
      case 'new':
        return 'New Files';
      case 'out-of-date':
        return 'Out-of-Date Files';
      case 'up-to-date':
        return 'Up-to-Date Files';
      default:
        return status;
    }
  };

  const getSectionIcon = (status: FileStatus): string => {
    switch (status) {
      case 'new':
        return '●';
      case 'out-of-date':
        return '⚠';
      case 'up-to-date':
        return '✓';
      default:
        return '•';
    }
  };

  const totalFiles = files.length;
  const filteredCount = filteredFiles.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Files: ${configName}`} size="lg">
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {searchQuery
            ? `Showing ${filteredCount} of ${totalFiles} files`
            : `${totalFiles} total files`}
        </div>

        {/* File groups */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {(Object.keys(groupedFiles) as FileStatus[]).map((status) => {
            const sectionFiles = groupedFiles[status];
            if (sectionFiles.length === 0) return null;

            const isExpanded = expandedSections.has(status);
            const colorClass = getSectionColor(status);

            return (
              <div key={status} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(status)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span className={`font-medium ${colorClass}`}>
                      {getSectionIcon(status)} {getSectionLabel(status)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">({sectionFiles.length})</span>
                  </div>
                </button>

                {/* Section content */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sectionFiles.map((fileState) => (
                      <div
                        key={fileState.file}
                        className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                            {fileState.file}
                          </div>
                          {fileState.last_hash && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                              Hash: {fileState.last_hash.substring(0, 12)}...
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetFile(fileState.file)}
                          disabled={isResetting}
                          icon={<RefreshCw className="w-3 h-3" />}
                          className="ml-2 flex-shrink-0"
                        >
                          Reset
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No files match your search' : 'No files found'}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
