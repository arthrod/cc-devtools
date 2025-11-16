import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Brain } from 'lucide-react';
import type { Memory } from '../../../../web/shared/types/memory.js';
import { MemoryCard } from './MemoryCard.js';

interface VirtualizedMemoryListProps {
  memories: Memory[];
  expandedMemoryId: string | null;
  onToggleMemory: (memoryId: string) => void;
  onContextMenu: (e: React.MouseEvent, memory: Memory) => void;
  onTouchStart: (e: React.TouchEvent, memory: Memory) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  header?: React.ReactNode;
}

/**
 * Virtualized memory list component that efficiently renders large lists
 * by only rendering visible items in the viewport.
 */
export function VirtualizedMemoryList({
  memories,
  expandedMemoryId,
  onToggleMemory,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  header,
}: VirtualizedMemoryListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: memories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    getItemKey: (index) => memories[index]?.id ?? index,
  });

  const items = virtualizer.getVirtualItems();

  if (memories.length === 0) {
    return (
      <div ref={parentRef} className="h-full overflow-auto">
        {header}
        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center space-y-4">
            <Brain size={64} className="mx-auto text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No memories found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Memories will appear here as conversations are stored
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }}
    >
      {header}
      <div className="px-6 py-6">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
          className="max-w-7xl mx-auto"
        >
        {items.map((virtualItem) => {
          const memory = memories[virtualItem.index];
          if (!memory) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="mb-2"
            >
              <MemoryCard
                memory={memory}
                isExpanded={expandedMemoryId === memory.id}
                onToggle={() => onToggleMemory(memory.id)}
                onContextMenu={(e) => onContextMenu(e, memory)}
                onTouchStart={(e) => onTouchStart(e, memory)}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
              />
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
