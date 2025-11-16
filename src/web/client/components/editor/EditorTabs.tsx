import React, { useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { FileIcon } from '../common/FileIcon';

interface EditorTab {
  path: string;
  name: string;
  isDirty: boolean;
  language?: string;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTab: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  onTabsReorder?: (fromIndex: number, toIndex: number) => void;
  className?: string;
}

const getFileNameFromPath = (path: string): string => {
  return path.split('/').pop() ?? path;
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTab,
  onTabSelect,
  onTabClose,
  onTabsReorder,
  className = '',
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const draggedTabRef = useRef<string | null>(null);
  const dragOverTabRef = useRef<string | null>(null);

  const handleTabClick = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.preventDefault();
      if (e.button === 1) {
        onTabClose(path);
      } else {
        onTabSelect(path);
      }
    },
    [onTabSelect, onTabClose]
  );

  const handleCloseClick = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.preventDefault();
      e.stopPropagation();
      onTabClose(path);
    },
    [onTabClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, path: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onTabSelect(path);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onTabClose(path);
      }
    },
    [onTabSelect, onTabClose]
  );

  const handleDragStart = useCallback((e: React.DragEvent, path: string) => {
    draggedTabRef.current = path;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', path);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, path: string) => {
    if (!draggedTabRef.current || draggedTabRef.current === path) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverTabRef.current = path;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, path: string) => {
      e.preventDefault();

      const draggedPath = draggedTabRef.current;
      if (!draggedPath || draggedPath === path || !onTabsReorder) return;

      const fromIndex = tabs.findIndex((tab) => tab.path === draggedPath);
      const toIndex = tabs.findIndex((tab) => tab.path === path);

      if (fromIndex !== -1 && toIndex !== -1) {
        onTabsReorder(fromIndex, toIndex);
      }

      draggedTabRef.current = null;
      dragOverTabRef.current = null;
    },
    [tabs, onTabsReorder]
  );

  const handleDragEnd = useCallback(() => {
    draggedTabRef.current = null;
    dragOverTabRef.current = null;
  }, []);

  useEffect(() => {
    if (!activeTab || !tabsContainerRef.current) return;

    const activeTabElement = tabsContainerRef.current.querySelector(`[data-tab-path="${activeTab}"]`);
    if (activeTabElement) {
      activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTab]);

  if (tabs.length === 0) {
    return (
      <div
        className={`h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${className}`}
      >
        <span className="text-sm text-gray-500 dark:text-gray-400">No files open</span>
      </div>
    );
  }

  return (
    <div className={`h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${className}`}>
      <div
        ref={tabsContainerRef}
        className="flex overflow-x-auto overflow-y-hidden h-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.path;
          const fileName = getFileNameFromPath(tab.name);

          return (
            <div
              key={tab.path}
              data-tab-path={tab.path}
              className={`
                flex items-center px-3 py-2 border-r border-gray-200 dark:border-gray-700
                cursor-pointer select-none min-w-0 max-w-xs group transition-colors duration-150
                ${isActive ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-b-2 border-blue-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
              `}
              onClick={(e) => handleTabClick(e, tab.path)}
              onKeyDown={(e) => handleKeyDown(e, tab.path)}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              draggable={!!onTabsReorder}
              onDragStart={(e) => handleDragStart(e, tab.path)}
              onDragOver={(e) => handleDragOver(e, tab.path)}
              onDrop={(e) => handleDrop(e, tab.path)}
              onDragEnd={handleDragEnd}
              tabIndex={0}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.name}${tab.isDirty ? ' (modified)' : ''}`}
              title={`${tab.path}${tab.isDirty ? ' (modified)' : ''}`}
            >
              <div className="mr-2 flex-shrink-0" aria-hidden="true">
                <FileIcon fileName={fileName} className="w-4 h-4" />
              </div>

              <span className="truncate text-sm font-medium flex-1 min-w-0">{fileName}</span>

              {tab.isDirty && (
                <span className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" aria-label="Modified" />
              )}

              <button
                onClick={(e) => handleCloseClick(e, tab.path)}
                className={`
                  ml-2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0
                  transition-opacity duration-150
                  ${isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'}
                `}
                aria-label={`Close ${tab.name}`}
                tabIndex={-1}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
