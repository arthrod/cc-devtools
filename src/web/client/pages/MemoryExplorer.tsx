import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useMemories, useDeleteMemory } from '../hooks/useMemories.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { VirtualizedMemoryList } from '../components/memory/VirtualizedMemoryList.js';
import { DeleteMemoryModal } from '../components/memory/DeleteMemoryModal.js';
import { LoadingSpinner } from '../components/shared/LoadingSpinner.js';
import { ErrorMessage } from '../components/shared/ErrorMessage.js';
import { SearchBar } from '../components/shared/SearchBar.js';
import { Button } from '../components/common/Button.js';
import type { Memory } from '../../../web/shared/types/memory.js';

/**
 * Memory Explorer page component providing comprehensive search, browsing, and management
 * of stored conversation memories with client-side pagination and real-time SSE updates.
 */
export function MemoryExplorer(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [touchTimeout, setTouchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  // Use debounced value for search - prevents excessive queries while typing
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch memories with consolidated query (no query thrash!)
  const { data: memories = [], isFetching: isLoading, error } = useMemories({
    query: debouncedSearchQuery,
    limit: 200,
  });

  // Preserve cursor position and focus across re-renders
  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;

    // Restore focus and cursor if we had saved position
    if (document.activeElement !== input && cursorPositionRef.current !== null) {
      input.focus();
      input.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
      cursorPositionRef.current = null;
    }
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    // Save cursor position before state update
    cursorPositionRef.current = e.target.selectionStart;
    setSearchQuery(e.target.value);
  }, []);

  // Sort by most recent (descending)
  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => b.created_at - a.created_at);
  }, [memories]);

  // Delete mutation
  const { mutate: deleteMemory, isPending: isDeleting } = useDeleteMemory();

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuVisible(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setContextMenuVisible(false);
      }
    };

    if (contextMenuVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuVisible]);

  const handleToggleMemory = (memoryId: string): void => {
    setExpandedMemory((prev) => (prev === memoryId ? null : memoryId));
  };

  const handleMemoryContextMenu = (e: React.MouseEvent, memory: Memory): void => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedMemory(memory);
    setContextMenuPosition({ x: e.pageX, y: e.pageY });
    setContextMenuVisible(true);
  };

  const handleShowDeleteModal = (): void => {
    setContextMenuVisible(false);
    setShowDeleteModal(true);
  };

  const handleDeleteMemory = (): void => {
    if (!selectedMemory) return;

    deleteMemory(selectedMemory.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setSelectedMemory(null);
        if (expandedMemory === selectedMemory.id) {
          setExpandedMemory(null);
        }
      },
    });
  };

  const handleCloseDeleteModal = (): void => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setSelectedMemory(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, memory: Memory): void => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
      const timeout = setTimeout(() => {
        const currentTouch = e.touches[0];
        if (currentTouch) {
          setSelectedMemory(memory);
          setContextMenuPosition({ x: currentTouch.pageX, y: currentTouch.pageY });
          setContextMenuVisible(true);
        }
      }, 500);
      setTouchTimeout(timeout);
    }
  };

  const handleTouchEnd = (): void => {
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      setTouchTimeout(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (touchTimeout) {
      const touch = e.touches[0];
      if (touch) {
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(touchTimeout);
          setTouchTimeout(null);
        }
      }
    }
  };

  if (isLoading && sortedMemories.length === 0) {
    return <LoadingSpinner message="Loading memories..." />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Virtualized list - this is the scroll container */}
      <div className="flex-1 min-h-0">
        <VirtualizedMemoryList
          memories={sortedMemories}
          expandedMemoryId={expandedMemory}
          onToggleMemory={handleToggleMemory}
          onContextMenu={handleMemoryContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          header={
            <>
              {/* Header with Search */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-4">
                    {/* Search Bar - flex-1 to take available space */}
                    <div className="flex-1 [&_.search-container]:mb-0">
                      <SearchBar
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search memories..."
                        inputRef={searchInputRef}
                      />
                    </div>

                    {/* Results Count */}
                    {sortedMemories.length > 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {searchQuery.trim() ? `Found ${sortedMemories.length} memories` : `${sortedMemories.length} total memories`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="px-6 pt-6">
                  <div className="max-w-7xl mx-auto">
                    <ErrorMessage
                      message={error instanceof Error ? error.message : 'Failed to load memories'}
                      onDismiss={() => {
                        /* Error is from React Query, will auto-dismiss on retry */
                      }}
                      className="mb-6"
                    />
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>

      {/* Context Menu */}
      {contextMenuVisible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <Button
            variant="ghost"
            onClick={handleShowDeleteModal}
            disabled={isDeleting}
            className="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete Memory
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteMemoryModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteMemory}
        memory={
          selectedMemory
            ? {
                id: selectedMemory.id,
                summary: selectedMemory.summary,
              }
            : null
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
